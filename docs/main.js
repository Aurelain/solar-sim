// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const HISTORIC_CAPACITY = 3520; // 8 * 440W
const PRODUCTION_MANUAL_BOOST = 1.02; // 2% better when the panels are cleaned
const DETAILS = {
    interval: 'Moment',
    spotPzu: 'PZU (RON/kWh)',
    panels: 'Production (kW)',
    action: 'Acțiune',
    battery: 'Bat. (kWh)',
    batteryPercent: 'Bat. (%)',
    batteryTraffic: 'Trafic bat. (kWh)',
    batteryCycles: 'Cicluri',
    batteryOut: 'Uzură bat. (RON)',
    sunToGrid: 'Direct (kWh)',
    sunToGridIncome: 'Direct (RON)',
    batteryToGrid: 'Stocat (kWh)',
    batteryToGridIncome: 'Stocat (RON)',
    sunToTank: 'Risipit (kWh)',
    panelsOut: 'Uzură panouri (RON)',
    adminOut: 'Costuri admin',
}
let detailsLimit = 0;
// let detailsLimit = 200;

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
window.onload = () => {
    write('production', computeAverageProduction(window.PRODUCTION));
    write('pzu', computeAveragePzu(window.PRICES));
    document.getElementById('more').onclick = (event) => {
        detailsLimit += event.ctrlKey? Number.MAX_SAFE_INTEGER : 100;
        run();
    }
    Array.from(document.querySelectorAll('select,input')).forEach((el) => el.addEventListener('change', run));
    run();
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
function computeAverageProduction(hub) {
    const byHour = {};
    for (const key in hub) {
        const hourlyKey = key.replace(/:\d+/, '');
        byHour[hourlyKey] = byHour[hourlyKey] || [];
        byHour[hourlyKey].push(hub[key]);
    }
    computeAverages(byHour, 4);
    const total = sum(Object.values(byHour));
    return Math.round(PRODUCTION_MANUAL_BOOST * total / HISTORIC_CAPACITY);
}

/**
 *
 */
function computeAveragePzu(hub) {
    const byHour = {};
    for (const key in hub) {
        let hourlyKey = key.replace(/:\d+/, '');
        hourlyKey = hourlyKey.replace(/24$/, '23');
        byHour[hourlyKey] = byHour[hourlyKey] || [];
        byHour[hourlyKey].push(hub[key]);
    }
    computeAverages(byHour, 4);
    const values = Object.values(byHour);
    const total = sum(values);
    const count = values.length;
    return (total / count / 1000).toFixed(3);
}

/**
 *
 */
function run() {
    const config = collectConfig();
    const progress = compute(config);
    updateResults(progress, config);
    if (detailsLimit) {
        updateDetails(progress);
    }
}

/**
 *
 */
function collectConfig() {
    const isDynamic = read('policy');
    hide('policy-static', isDynamic);
    hide('policy-dynamic', !isDynamic);

    const battery = read('battery');
    const batteryCostPerKwh = read('battery-cost-per-kwh');
    const batteryCycles = read('battery-cycles');
    const batteryCost = batteryCostPerKwh * battery;
    const batteryDepreciationPerCycle = batteryCost/batteryCycles;

    return {
        production: window.PRODUCTION,
        panels: read('panels'),
        panelsCostPerKwGlass: read('panels-cost-per-kw-glass'),
        panelsCostPerKwSetup: read('panels-cost-per-kw-setup'),
        panelsDuration: read('panels-duration'),
        battery,
        batteryCostPerKwh,
        batteryCycles,
        minimumBattery: read('minimum-battery'),
        storageEfficiency: read('storage-efficiency'),
        batteryDepreciationPerCycle, // computed
        isDynamic,
        staticPrice: read('static-price'),
        pzu: window.PRICES,
        minimumFeedPrice: read('minimum-feed-price'),
        maximumExtractionPrice: read('maximum-extraction-price'),
        deer: read('deer'),
        commission: read('commission'),
        cleaning: read('cleaning'),
        insurance: read('insurance'),
        accounting: read('accounting'),
        eur: read('eur'),
        capexConnection0: read('capex-connection0'),
        capexOthers0: read('capex-others0'),
    };
}

/**
 *
 */
function updateResults(progress, config) {
    const {eur} = config;

    const capexPanels = (config.panelsCostPerKwGlass+config.panelsCostPerKwSetup) * config.panels;
    const capexBattery = config.batteryCostPerKwh * config.battery;
    const capex = capexPanels + capexBattery + config.capexConnection0 + config.capexOthers0;
    write('capex', Math.round(capex / eur));
    write('capex-panels', Math.round(capexPanels / eur));
    write('capex-battery', Math.round(capexBattery / eur));
    write('capex-connection1', Math.round(config.capexConnection0 / eur));
    write('capex-others1', Math.round(config.capexOthers0 / eur));

    const last = progress.at(-1);
    const income = last.sunToGridIncome + last.batteryToGridIncome;
    const expenses = last.batteryOut + last.panelsOut + last.adminOut;
    write('ebitda', Math.round((income-expenses)/ eur));
    write('i-direct', Math.round(last.sunToGridIncome / eur));
    write('i-stored', Math.round(last.batteryToGridIncome / eur));
    write('o-battery', Math.round(last.batteryOut / eur));
    write('o-panels', Math.round(last.panelsOut / eur));
    write('o-admin', Math.round(last.adminOut / eur));

}

/**
 *
 */
function updateDetails(progress) {
    const lines = [];
    lines.push('<table>');
    lines.push('<tr>');
    for (const key in DETAILS) {
        lines.push(`<th>${DETAILS[key]}</th>`);
    }
    lines.push('</tr>');
    let step = 0;
    for (const entry of progress) {
        if (step++ >= detailsLimit) {
            lines.push('<tr>');
            lines.push('<td>...</td>');
            lines.push('<tr>');
            break;
        }
        lines.push('<tr>');
        for (const key in DETAILS) {
            let value = entry[key];
            if (typeof value === 'number' && value.toString().includes('.')) {
                value = value.toFixed(2);
            }
            lines.push(`<td>${value}</td>`);
        }
        lines.push('</tr>');
    }
    lines.push('</table>');
    write('dump', lines.join(''));
}

// =====================================================================================================================
//  U T I L S
// =====================================================================================================================
/**
 *
 */
function computeAverages(hub, forcedDenominator) {
    for (const key in hub) {
        const values = hub[key];
        const denominator = forcedDenominator || values.length;
        hub[key] = Number(Number(sum(values) / denominator));
    }
}

/**
 *
 */
function sum(list) {
    return list.reduce((partialSum, a) => partialSum + a, 0);
}

/**
 *
 */
function read(id) {
    return Number(document.getElementById(id).value) || 0;
}

/**
 *
 */
function write(id, value) {
    return document.getElementById(id).innerHTML = value.toString();
}

/**
 *
 */
function hide(id, force) {
    document.getElementById(id).classList.toggle('hidden', force);
}