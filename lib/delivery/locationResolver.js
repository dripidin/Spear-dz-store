'use strict';

/**
 * =============================================================================
 * SPEAR-DZ — Authoritative Carrier Location & Service Availability Resolver
 * Resolves Algerian Wilayas and Communes to exact carrier-recognized identifiers,
 * normalizes Arabic/French inputs, handles transliteration aliases,
 * and validates home vs stop-desk delivery availability.
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

const redexCommunesPath = path.join(__dirname, '..', '..', 'config', 'redex_communes.json');
const localCommunesPath = path.join(__dirname, '..', '..', 'config', 'communes.json');
const wilayasPath = path.join(__dirname, '..', '..', 'config', 'wilayas.json');

let redexCommunes = [];
let localCommunes = [];
let wilayasList = [];

try {
    redexCommunes = JSON.parse(fs.readFileSync(redexCommunesPath, 'utf8'));
    localCommunes = JSON.parse(fs.readFileSync(localCommunesPath, 'utf8'));
    wilayasList = JSON.parse(fs.readFileSync(wilayasPath, 'utf8'));
} catch (e) {
    console.warn('[locationResolver] Error loading datasets:', e.message);
}

// Explicit alias table for known Algerian municipality spelling variations
const KNOWN_COMMUNE_ALIASES = {
    // Wilaya 3 - Laghouat
    '3:el beidha': 'Beidha',
    '3:البيضاء': 'Beidha',

    // Wilaya 8 - Béchar
    '8:machraa-houari-boumediene': 'Mechraa H.b',
    '8:machraa houari boumediene': 'Mechraa H.b',
    '8:مشرع هواري بومدين': 'Mechraa H.b',

    // Wilaya 10 - Bouira
    '10:ath mansour': 'Ath Mansour Taourirt',
    '10:آث منصور': 'Ath Mansour Taourirt',

    // Wilaya 11 - Tamanrasset
    '11:abelsa': 'Abalessa',
    '11:ابلسة': 'Abalessa',

    // Wilaya 13 - Tlemcen
    '13:beni khellad': 'Beni Khaled',
    '13:بني خلاد': 'Beni Khaled',

    // Wilaya 15 - Tizi Ouzou
    '15:ait-aissa-mimoun': 'Ait Aissa Mimoun',
    '15:ait aissa mimoun': 'Ait Aissa Mimoun',
    '15:أيت عيسى ميمون': 'Ait Aissa Mimoun',

    // Wilaya 16 - Alger
    '16:hammamet': 'Bains Romains',
    '16:el hammamet': 'Bains Romains',
    '16:الحمامات': 'Bains Romains',

    // Wilaya 21 - Skikda
    '21:khenag maoune': 'Khenag Mayoum',
    '21:خناق مايو': 'Khenag Mayoum',

    // Wilaya 22 - Sidi Bel Abbès
    '22:bedrabine el mokrani': 'Badredine El Mokrani',
    '22:بضرابين المقراني': 'Badredine El Mokrani',

    // Wilaya 23 - Annaba
    '23:ain el berda': 'Ain Berda',
    '23:عين الباردة': 'Ain Berda',
    '23:el eulma': 'Eulma',
    '23:العلمة': 'Eulma',

    // Wilaya 24 - Guelma
    '24:ain sandel': 'Sidi Sandel',
    '24:عين صندل': 'Sidi Sandel',
    '24:houari boumedienne': 'Ain Hessania',
    '24:هواري بومدين': 'Ain Hessania',

    // Wilaya 26 - Médéa
    '26:m\'fatha': 'Meftaha',
    '26:mfatha': 'Meftaha',
    '26:مفاتحة': 'Meftaha',

    // Wilaya 34 - Bordj Bou Arréridj
    '34:b. b. arreridj': 'Bordj Bou Arreridj',
    '34:b b arreridj': 'Bordj Bou Arreridj',
    '34:برج بوعريرج': 'Bordj Bou Arreridj',
    '34:el annasseur': 'El Anseur',
    '34:العناصر': 'El Anseur',
    '34:tassamert': 'Tesmart',
    '34:تسامرت': 'Tesmart',

    // Wilaya 43 - Mila
    '43:tassala lematai': 'Tessala',
    '43:تسالة لمطاعي': 'Tessala',

    // Wilaya 45 - Naâma
    '45:djenienne bourezg': 'Djeniane Bourzeg',
    '45:جنين بورزق': 'Djeniane Bourzeg',

    // Wilaya 53 - In Salah
    '53:foggaret ezzoua': 'Foggaret Azzaouia',
    '53:فقارة الزوى': 'Foggaret Azzaouia'
};

function cleanLatinString(s) {
    if (!s || typeof s !== 'string') return '';
    return s.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/['’`\-_.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function cleanArabicString(s) {
    if (!s || typeof s !== 'string') return '';
    return s.replace(/[\u064B-\u065F\u0670]/g, '') // strip tashkeel
        .replace(/[إأآا]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\s\-_.]+/g, ' ')
        .trim();
}

function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

/**
 * Resolves a Wilaya input (code, name, or formatted string like "14 - Tiaret (تيارت)")
 * to a standardized wilaya object { code, name, nameAr }.
 */
function resolveWilaya(input) {
    if (!input) return { code: 16, name: 'Alger', nameAr: 'الجزائر' };

    let code = null;
    if (typeof input === 'number') {
        code = input;
    } else {
        const str = String(input).trim();
        const m = str.match(/^(\d{1,2})/);
        if (m) {
            code = parseInt(m[1], 10);
        } else {
            // Match by name or Arabic name
            const clean = cleanLatinString(str);
            const cleanAr = cleanArabicString(str);
            const found = wilayasList.find(w =>
                cleanLatinString(w.name) === clean ||
                cleanArabicString(w.nameAr) === cleanAr
            );
            if (found) code = found.code;
        }
    }

    if (!code || isNaN(code) || code < 1 || code > 58) {
        code = 16;
    }

    const wilayaObj = wilayasList.find(w => w.code === code) || {
        code,
        name: `Wilaya ${code}`,
        nameAr: `ولاية ${code}`
    };

    return wilayaObj;
}

/**
 * Resolves a commune input against the carrier's authoritative location catalogue.
 * Returns an object containing the resolved official name, stopdesk support, and postal code.
 */
function resolveCommune(wilayaCode, communeInput, carrierId = 'redex') {
    const wCode = resolveWilaya(wilayaCode).code;
    const rawCommune = String(communeInput || '').trim();

    if (!rawCommune) {
        return {
            matched: false,
            officialName: 'Centre Ville',
            raw: rawCommune,
            hasStopDesk: false,
            codePostal: ''
        };
    }

    // Currently authoritative carrier catalogue: Redex (Ecotrack DZ)
    const candidates = redexCommunes.filter(rc => rc.wilaya_id === wCode);
    if (!candidates || candidates.length === 0) {
        return {
            matched: false,
            officialName: rawCommune,
            raw: rawCommune,
            hasStopDesk: false,
            codePostal: ''
        };
    }

    // Check alias dictionary first
    const aliasKey = `${wCode}:${rawCommune.toLowerCase()}`;
    const aliasKeyClean = `${wCode}:${cleanLatinString(rawCommune)}`;
    if (KNOWN_COMMUNE_ALIASES[aliasKey] || KNOWN_COMMUNE_ALIASES[aliasKeyClean]) {
        const aliasTarget = KNOWN_COMMUNE_ALIASES[aliasKey] || KNOWN_COMMUNE_ALIASES[aliasKeyClean];
        const match = candidates.find(c => cleanLatinString(c.nom) === cleanLatinString(aliasTarget));
        if (match) {
            return {
                matched: true,
                officialName: match.nom,
                raw: rawCommune,
                hasStopDesk: Boolean(match.has_stop_desk === 1 || match.has_stop_desk === '1'),
                codePostal: match.code_postal || ''
            };
        }
    }

    let targetName = rawCommune;

    // If input is in Arabic, resolve to French name first via localCommunes
    if (/[\u0600-\u06FF]/.test(rawCommune)) {
        const cleanArInput = cleanArabicString(rawCommune);
        const arMatch = localCommunes.find(lc =>
            lc.wilayaCode === wCode &&
            cleanArabicString(lc.nameAr) === cleanArInput
        );
        if (arMatch) {
            targetName = arMatch.name;
        }
    }

    const cleanTarget = cleanLatinString(targetName);

    // 1. Exact match (case-insensitive)
    let matchedCandidate = candidates.find(c => c.nom.toLowerCase() === targetName.toLowerCase());

    // 2. Normalized match (accents & punctuation stripped)
    if (!matchedCandidate) {
        matchedCandidate = candidates.find(c => cleanLatinString(c.nom) === cleanTarget);
    }

    // 3. Normalized without spaces
    if (!matchedCandidate) {
        const noSpaceTarget = cleanTarget.replace(/\s/g, '');
        matchedCandidate = candidates.find(c => cleanLatinString(c.nom).replace(/\s/g, '') === noSpaceTarget);
    }

    // 4. StartsWith / Prefix match (for communes >= 4 characters)
    if (!matchedCandidate && cleanTarget.length >= 4) {
        matchedCandidate = candidates.find(c => {
            const cn = cleanLatinString(c.nom);
            return cn.startsWith(cleanTarget) || cleanTarget.startsWith(cn);
        });
    }

    // 5. Levenshtein fuzzy match within the same wilaya (distance <= 2)
    if (!matchedCandidate && cleanTarget.length >= 4) {
        let bestDist = 99;
        let best = null;
        for (const c of candidates) {
            const cn = cleanLatinString(c.nom);
            const dist = levenshteinDistance(cleanTarget, cn);
            if (dist <= 2 && dist < bestDist) {
                bestDist = dist;
                best = c;
            }
        }
        if (best) matchedCandidate = best;
    }

    if (matchedCandidate) {
        return {
            matched: true,
            officialName: matchedCandidate.nom,
            raw: rawCommune,
            hasStopDesk: Boolean(matchedCandidate.has_stop_desk === 1 || matchedCandidate.has_stop_desk === '1'),
            codePostal: matchedCandidate.code_postal || ''
        };
    }

    // Fallback: Preserves user input cleanly if not found in catalogue
    return {
        matched: false,
        officialName: rawCommune,
        raw: rawCommune,
        hasStopDesk: false,
        codePostal: ''
    };
}

/**
 * Validates delivery service availability (Home vs Stop Desk) for the given commune.
 * Returns availability, resolved official commune, and descriptive diagnostic error message if unavailable.
 */
function verifyDeliveryAvailability(wilayaCode, communeInput, deliveryType, carrierId = 'redex') {
    const wilaya = resolveWilaya(wilayaCode);
    const resolved = resolveCommune(wilaya.code, communeInput, carrierId);
    const isDesk = deliveryType === 'desk' || deliveryType === 'stopdesk';

    if (isDesk) {
        if (!resolved.hasStopDesk) {
            return {
                available: false,
                service: 'stopdesk',
                code: 'STOPDESK_UNAVAILABLE',
                message: `Stop desk non disponible pour la commune "${resolved.officialName}" (Wilaya ${wilaya.code} - ${wilaya.name}). La livraison à domicile reste disponible.`,
                alternative: 'home',
                wilayaCode: wilaya.code,
                commune: resolved.officialName,
                rawCommune: communeInput
            };
        }
    }

    return {
        available: true,
        service: isDesk ? 'stopdesk' : 'home',
        wilayaCode: wilaya.code,
        commune: resolved.officialName,
        rawCommune: communeInput,
        hasStopDesk: resolved.hasStopDesk
    };
}

/**
 * Returns the list of communes that support stop desk for a given wilaya.
 */
function getStopDeskCommunesForWilaya(wilayaCode, carrierId = 'redex') {
    const wCode = resolveWilaya(wilayaCode).code;
    return redexCommunes
        .filter(rc => rc.wilaya_id === wCode && (rc.has_stop_desk === 1 || rc.has_stop_desk === '1'))
        .map(rc => rc.nom);
}

module.exports = {
    resolveWilaya,
    resolveCommune,
    verifyDeliveryAvailability,
    getStopDeskCommunesForWilaya,
    cleanLatinString,
    cleanArabicString
};
