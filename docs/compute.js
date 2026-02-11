/*
In order to simplify the computations, we had to make some questionable assumptions:
1. Our first priority is filling the batteries (no grid feed until the batteries are full)
2. We only fill the batteries from the sun (no winter-trading)
3. We only discharge the batteries starting from 18:00 (this avoids looking for a maximum in the evening)
4. We're only doing one action at a time
*/

const SUN_TO_BATTERY = 'SUN_TO_BATTERY';
const SUN_TO_GRID = 'SUN_TO_GRID';
const SUN_TO_TANK = 'SUN_TO_TANK';
const BATTERY_TO_GRID = 'BATTERY_TO_GRID';
const NOTHING = 'NOTHING';
const CRITICAL_HOUR = 19;

/**
 *
 */
window.compute = (config) => {
    const cleaningPerYear = config.cleaning * 12 * config.panels;
    const insurancePerYear = config.insurance * (config.panels + config.battery);
    const accountingPerYear = config.accounting * 12;
    const adminPerYear = cleaningPerYear + insurancePerYear + accountingPerYear;
    const adminPerQuarterHour = adminPerYear/365/24/4;

    const collector = {
        battery: config.battery * 0.2,
        batteryPercent: 20,
        batteryTraffic: 0,
        batteryCycles: 0,
        batteryOut: 0,
        sunToGrid: 0,
        sunToGridIncome: 0,
        batteryToGrid: 0,
        batteryToGridIncome: 0,
        sunToTank: 0,
        adminOut: 0,
    };
    const progress = [];
    for (const key in config.pzu) {
        const spotPzu = config.pzu[key] / 1000;
        const spotProduction = config.production[key] || 0;
        const hour = Number(key.match(/(\d\d):/)[1]);
        const action = decideAction(hour, spotPzu, spotProduction, collector, config);
        implementAction(action, spotPzu, spotProduction, collector, config, key);
        collector.adminOut += adminPerQuarterHour;
        progress.push({
            interval: key,
            spotPzu: spotPzu.toFixed(3),
            panels: spotProduction * config.panels / HISTORIC_CAPACITY,
            action,
            ...collector,
        });
    }
    return progress;
};

/**
 *
 */
function decideAction(hour, spotPzu, spotProduction, collector, config) {
    if (spotProduction) {
        // The sun is up
        if (collector.batteryPercent < 100) {
            // We need to charge
            return SUN_TO_BATTERY;
        } else {
            // The batteries are full
            if (spotPzu > 0) {
                // Normal PZU price
                return SUN_TO_GRID;
            } else {
                // Negative pricing, DO NOT FEED THE GRID!
                return SUN_TO_TANK;
            }
        }
    } else {
        // The sun is down
        if (collector.batteryPercent > config.minimumBattery) {
            // We have some charge pending
            if (hour >= CRITICAL_HOUR && spotPzu > 0) {
                // Fertile interval
                return BATTERY_TO_GRID;
            } else {
                // Not a good moment to feed the grid
                return NOTHING;
            }
        } else {
            // The sun is down and the batteries are empty
            return NOTHING;
        }
    }
}

/**
 *
 */
function implementAction(action, spotPzu, spotProduction, collector, config, key) {
    switch (action) {
        case NOTHING:
            return;
        case SUN_TO_BATTERY: {
            const ratio = spotProduction / HISTORIC_CAPACITY;
            const currentKw = config.panels * ratio;
            const addedInTheLastQuarter = currentKw / 4;
            collector.battery = Math.min(collector.battery + addedInTheLastQuarter, config.battery);
            collector.batteryPercent = 100 * collector.battery / config.battery;
            updateBatteryTraffic(addedInTheLastQuarter, collector, config);
            break;
        }
        case SUN_TO_GRID: {
            const ratio = spotProduction / HISTORIC_CAPACITY;
            const currentKw = config.panels * ratio;
            const addedInTheLastQuarter = currentKw / 4;
            const kwhPrice = getActualPrice(spotPzu, config);
            collector.sunToGrid += addedInTheLastQuarter;
            collector.sunToGridIncome += addedInTheLastQuarter * kwhPrice;
            break;
        }
        case SUN_TO_TANK: {
            const ratio = spotProduction / HISTORIC_CAPACITY;
            const currentKw = config.panels * ratio;
            const addedInTheLastQuarter = currentKw / 4;
            collector.sunToTank += addedInTheLastQuarter;
            break;
        }
        case BATTERY_TO_GRID: {
            const maximumOutflowIn1Hour = config.battery / 2; // 0.5C
            let outflow = maximumOutflowIn1Hour / 4; // quarter-hour
            let futureBattery = collector.battery - outflow;
            let futurePercent = 100 * futureBattery / config.battery;
            if (futurePercent < config.minimumBattery) {
                futurePercent = config.minimumBattery;
                futureBattery = config.battery * futurePercent / 100;
                outflow = collector.battery - futureBattery;
            }
            collector.battery = futureBattery;
            collector.batteryPercent = futurePercent;
            updateBatteryTraffic(outflow, collector, config);
            const kwhPrice = getActualPrice(spotPzu, config);
            const outflowToGrid = outflow * config.storageEfficiency / 100;
            collector.batteryToGrid += outflowToGrid;
            collector.batteryToGridIncome += outflowToGrid * kwhPrice;
            break;
        }
        default:
            throw new Error(`Unrecognized action "${action}" in ${key}!`);
    }
}

/**
 *
 */
function updateBatteryTraffic(added, collector, config) {
    collector.batteryTraffic += added;
    const cycleSize = (config.battery - config.battery * config.minimumBattery/100)*2;
    collector.batteryCycles = Math.floor(collector.batteryTraffic / cycleSize);
    collector.batteryOut = config.batteryDepreciationPerCycle * collector.batteryCycles;
}

/**
 *
 */
function getActualPrice(spotPzu, config) {
    if (config.isDynamic) {
        if (spotPzu < config.minimumFeedPrice) {
            return config.minimumFeedPrice;
        } else {
            const delta = spotPzu - config.minimumFeedPrice;
            const lostToCommission = delta * config.commission / 100;
            return spotPzu - lostToCommission;
        }
    } else {
        return config.staticPrice;
    }
}