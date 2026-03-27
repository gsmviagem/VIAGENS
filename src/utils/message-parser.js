"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFlightMessage = parseFlightMessage;
var gender_dict_1 = require("./gender-dict");
var MONTHS_MAP = {
    jan: '01', january: '01', janeiro: '01',
    feb: '02', february: '02', fevereiro: '02',
    mar: '03', march: '03', marco: '03', março: '03',
    apr: '04', april: '04', abril: '04',
    may: '05', maio: '05',
    jun: '06', june: '06', junho: '06',
    jul: '07', july: '07', julho: '07',
    aug: '08', august: '08', agosto: '08',
    sep: '09', september: '09', setembro: '09',
    oct: '10', october: '10', outubro: '10',
    nov: '11', november: '11', novembro: '11',
    dec: '12', december: '12', dezembro: '12'
};
function parseFlightMessage(message, isAmericanFormat) {
    var _a;
    if (isAmericanFormat === void 0) { isAmericanFormat = false; }
    // 0. Initial Sanitization
    var msg = message.toLowerCase().replace(/\t/g, ' '); // Replace tabs with spaces
    msg = msg.replace(/\b(?:pls|please)\b/g, ' '); // Remove noise
    var data = {
        origin: '',
        destination: '',
        date: '',
        classType: '',
        partner: '',
        adults: 0,
        children: 0,
        infants: 0,
        flightTime: '',
        passengers: []
    };
    var workingMsg = msg;
    // --- 1. PASSENGER EXTRACTION (CONSUMER MODE) ---
    // This regex looks for: Name Title (optional) + Name + Date (Slashed or Textual)
    // Supports: "Joel Rubinstein 02/02/1982", "Pessy Rubinstein Nov. 28, 1981", "Hershy Rubinstein Feb. 16, 2021"
    var monthNames = Object.keys(MONTHS_MAP).join('|');
    // Regex components
    var namePart = /([a-zÀ-ÿ]{2,}(?:\s+[a-zÀ-ÿ]{2,})+)/.source;
    var datePart = new RegExp("(?:" +
        "(\\d{1,2})[/-](\\d{1,2})[/-](\\d{2,4})" + // 02/02/1982
        "|" +
        "(".concat(monthNames, ")[a-z.]*\\s*(?:(\\d{1,2})[\\s,]+)?(?:(\\d{1,2})[\\s,]+)?(\\d{4})") + // Nov. 28, 1981 or Jan 21 2007
        "|" +
        "(\\d{1,2})\\s+(".concat(monthNames, ")[a-z.]*\\s+(\\d{2,4})") + // 16 Feb 2021
        ")", 'i').source;
    var passengerRegex = new RegExp("".concat(namePart, "\\s+").concat(datePart), 'gi');
    var match;
    var passengersToRemove = [];
    while ((match = passengerRegex.exec(msg)) !== null) {
        var fullMatch = match[0];
        var nameText = match[1].trim();
        var names = nameText.split(/\s+/);
        var birthDay = '';
        var birthMonth = '';
        var birthYear = '';
        if (match[2]) { // Slashed: DD/MM/YYYY or MM/DD/YYYY
            if (isAmericanFormat) {
                birthMonth = match[2];
                birthDay = match[3];
            }
            else {
                birthDay = match[2];
                birthMonth = match[3];
            }
            birthYear = match[4];
        }
        else if (match[5]) { // Month-first: Nov. 28, 1981
            birthMonth = MONTHS_MAP[match[5].toLowerCase()];
            birthDay = match[6] || match[7] || '01'; // Handle Month Year or Month Day Year
            birthYear = match[8];
        }
        else if (match[9]) { // Day-first textual: 16 Feb 2021
            birthDay = match[9];
            birthMonth = MONTHS_MAP[match[10].toLowerCase()];
            birthYear = match[11];
        }
        if (names.length >= 2 && birthYear) {
            var fName = names[0];
            var lName = names.slice(1).join(' ');
            // Validate if it looks like a birth year (typically < current year - 1)
            var yearNum = parseInt(birthYear.length === 2 ? (parseInt(birthYear) > 25 ? "19".concat(birthYear) : "20".concat(birthYear)) : birthYear);
            var currentYear = new Date().getFullYear();
            if (yearNum < currentYear) {
                addPassenger(data, fName, lName, birthDay, birthMonth, yearNum.toString());
                passengersToRemove.push(fullMatch);
            }
        }
    }
    // Explicit counts (if any)
    var getCount = function (regex) {
        var count = 0;
        var m;
        while ((m = regex.exec(msg)) !== null) {
            count += parseInt(m[1] || m[2]);
        }
        return count;
    };
    var explicitAdults = getCount(/(?:(\d+)\s*(?:adulto|adultos|pax|adult\b|adults\b))|(?:(?:adulto|adultos|pax|adult\b|adults\b)\s*[:\-]?\s*(\d+))/gi);
    var explicitChildren = getCount(/(?:(\d+)\s*(?:crian[cç]as?|children|child|chld|chd\b))|(?:(?:crian[cç]as?|children|child|chld|chd\b)\s*[:\-]?\s*(\d+))/gi);
    var explicitInfants = getCount(/(?:(\d+)\s*(?:beb[eê]s?|infant|inf\b|baby|babies))|(?:(?:beb[eê]s?|infant|inf\b|baby|babies)\s*[:\-]?\s*(\d+))/gi);
    // Remove passengers from the "Flight Info Pool"
    var flightInfoPool = msg;
    for (var _i = 0, passengersToRemove_1 = passengersToRemove; _i < passengersToRemove_1.length; _i++) {
        var pStr = passengersToRemove_1[_i];
        flightInfoPool = flightInfoPool.replace(pStr, ' ');
    }
    // --- 2. ROUTE EXTRACTION ---
    var routeRegex = /\b([a-z]{3})\s*(?:-|to|\/|\s+)\s*([a-z]{3})\b/g;
    var excludedWords = new Set(['eco', 'for', 'pax', 'via', 'the', 'and', 'dep', 'arr', 'pls', 'now', 'day']);
    var routeMatch;
    while ((routeMatch = routeRegex.exec(flightInfoPool)) !== null) {
        var code1 = routeMatch[1].toLowerCase();
        var code2 = routeMatch[2].toLowerCase();
        if (!excludedWords.has(code1) && !excludedWords.has(code2)) {
            data.origin = code1.toUpperCase();
            data.destination = code2.toUpperCase();
            flightInfoPool = flightInfoPool.replace(routeMatch[0], ' ');
            break;
        }
    }
    // --- 3. FLIGHT DATE EXTRACTION ---
    // Search in the cleaned pool
    var slashDateMatch = flightInfoPool.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
    var textualDateMatch = flightInfoPool.match(new RegExp("(\\d{1,2})\\s*(?:de\\s+)?(".concat(monthNames, ")[a-z.]*(?:[\\s,]*(\\d{4}))?"), 'i'));
    var monthFirstMatch = flightInfoPool.match(new RegExp("(".concat(monthNames, ")[a-z.]*\\s*(\\d{1,2})(?:[\\s,]*(\\d{4}))?"), 'i'));
    if (slashDateMatch) {
        data.date = normalizeDate(slashDateMatch[1], slashDateMatch[2], slashDateMatch[3]);
        flightInfoPool = flightInfoPool.replace(slashDateMatch[0], ' ');
    }
    else if (textualDateMatch) {
        data.date = normalizeDate(textualDateMatch[1], MONTHS_MAP[textualDateMatch[2].toLowerCase()], textualDateMatch[3]);
        flightInfoPool = flightInfoPool.replace(textualDateMatch[0], ' ');
    }
    else if (monthFirstMatch) {
        data.date = normalizeDate(monthFirstMatch[2], MONTHS_MAP[monthFirstMatch[1].toLowerCase()], monthFirstMatch[3]);
        flightInfoPool = flightInfoPool.replace(monthFirstMatch[0], ' ');
    }
    // --- 4. TIME EXTRACTION ---
    var timeMatch = flightInfoPool.match(/\b(\d{1,2}:\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/i);
    if (timeMatch) {
        var hour = 0;
        var minutes = '00';
        var period = '';
        if (timeMatch[1]) {
            var parts = timeMatch[1].split(':');
            hour = parseInt(parts[0]);
            minutes = parts[1];
            period = ((_a = timeMatch[2]) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
        }
        else {
            hour = parseInt(timeMatch[3]);
            period = timeMatch[4].toLowerCase();
        }
        if (period === 'pm' && hour < 12)
            hour += 12;
        if (period === 'am' && hour === 12)
            hour = 0;
        data.flightTime = "".concat(hour.toString().padStart(2, '0'), ":").concat(minutes);
        flightInfoPool = flightInfoPool.replace(timeMatch[0], ' ');
    }
    // --- 5. CLASS & PARTNER ---
    if (/\bpremium\s*(?:economy|eco)\b/i.test(msg))
        data.classType = 'PREMIUM ECONOMY';
    else if (/\beconomy\b|\beconomica\b|\beco\b/i.test(msg))
        data.classType = 'ECONOMICA';
    else if (/\bbusiness\b|\bexecutiva\b|\bbiz\b/i.test(msg))
        data.classType = 'EXECUTIVA';
    else if (/\bfirst\b|\bprimeira\b/i.test(msg))
        data.classType = 'PRIMEIRA';
    var partnerMap = { vs: 'Virgin', dl: 'Delta', la: 'LATAM', ad: 'Azul', af: 'Air France', kl: 'KLM', ib: 'Iberia', tp: 'TAP' };
    for (var code in partnerMap) {
        if (new RegExp("\\b".concat(code, "\\b"), 'i').test(msg)) {
            data.partner = partnerMap[code];
            break;
        }
    }
    if (!data.partner) {
        var fullPartners = ['delta', 'virgin', 'latam', 'azul', 'smiles', 'tap', 'iberia', 'qatar', 'emirates'];
        for (var _b = 0, fullPartners_1 = fullPartners; _b < fullPartners_1.length; _b++) {
            var p = fullPartners_1[_b];
            if (msg.includes(p)) {
                data.partner = p.charAt(0).toUpperCase() + p.slice(1);
                break;
            }
        }
    }
    // Final adjustments
    data.adults = Math.max(data.adults, explicitAdults);
    data.children = Math.max(data.children, explicitChildren);
    data.infants = Math.max(data.infants, explicitInfants);
    data.hasFlightData = !!(data.origin || data.destination || data.date || data.flightTime);
    return data;
}
function normalizeDate(day, month, year) {
    var d = day.padStart(2, '0');
    var m = month.padStart(2, '0');
    var y = year || new Date().getFullYear().toString();
    if (y.length === 2)
        y = "20".concat(y);
    return "".concat(d, "/").concat(m, "/").concat(y);
}
function addPassenger(data, fName, lName, day, month, year) {
    var firstName = fName.charAt(0).toUpperCase() + fName.slice(1);
    var lastName = lName.charAt(0).toUpperCase() + lName.slice(1);
    var birthDate = "".concat(day.padStart(2, '0'), "/").concat(month.padStart(2, '0'), "/").concat(year);
    var age = new Date().getFullYear() - parseInt(year);
    if (age >= 12)
        data.adults++;
    else if (age >= 2)
        data.children++;
    else
        data.infants++;
    var femaleNames = new Set(['maria', 'ana', 'julia', 'lucia', 'carla', 'fernanda', 'andressa', 'alicia', 'beatriz', 'camila', 'clara', 'daniela', 'elisa', 'gabriela', 'isabela', 'laura', 'livia', 'luiza', 'manuela', 'mariana', 'nicole', 'paola', 'rafaela', 'sophia', 'valentina', 'conceição', 'vitoria', 'vitória', 'gitty', 'pessy', 'chaya', 'rivka', 'leah', 'rachel', 'sarah', 'miriam', 'esther', 'shoshana', 'tamar', 'yehudit', 'chana', 'devorah', 'malka', 'shira', 'yael', 'hannah', 'abigail', 'emma', 'olivia', 'ava', 'mia', 'charlotte', 'amelia', 'harper', 'evelyn', 'grace', 'zoe', 'chloe', 'penelope', 'riley', 'nora', 'lily', 'eleanor', 'avery', 'ella', 'scarlett', 'aria', 'lucy', 'mila', 'sofia', 'aline', 'bruna', 'carolina', 'diana', 'eduarda', 'flavia', 'giovanna', 'heloisa', 'isadora', 'joana', 'karina', 'leticia', 'marcela', 'natalia', 'patricia', 'renata', 'simone', 'tatiana', 'vanessa', 'yasmin', 'zilda', 'amanda', 'barbara']);
    var gender = 'Masculino'; // Default
    var lowerName = fName.toLowerCase();
    if (gender_dict_1.GENDER_DICT[lowerName] === 'Feminino') {
        gender = 'Feminino';
    }
    else if (gender_dict_1.GENDER_DICT[lowerName] === 'Masculino') {
        gender = 'Masculino';
    }
    else if (femaleNames.has(lowerName)) {
        gender = 'Feminino';
    }
    data.passengers.push({
        firstName: firstName,
        lastName: lastName,
        gender: gender,
        birthDate: birthDate,
        passportNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
        nationality: 'Estados Unidos',
        passportExpiry: "01/01/".concat(2030 + Math.floor(Math.random() * 5)),
        passportIssuanceCountry: 'Estados Unidos'
    });
}
