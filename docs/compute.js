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

/**
 *
 */
window.compute = (config) => {
    const {
        production,
        panels,
        battery,
        minimumBattery,
        storageEfficiency,
        batteryDepreciation,
        isDynamic,
        staticPrice,
        pzu,
        minimumFeedPrice,
        maximumExtractionPrice,
        deer,
        commission,
        cleaning,
        insurance,
        admin,
        eur
    } = config;

    const collector = {
        battery: battery * 0.2,
        batteryPercent: 20,
        cycles: 0,
        sunToBattery:0,
        sunToGrid:0,
        sunToTank:0,
        batteryToGrid: 0,
        gridToBattery:0,
        gridToTank:0,

    };
    const progress = [];
    let step = 0;
    for (const key in pzu) {
        const spotPzu = pzu[key];
        if (step++ >= 100) {
            break;
        }
        const spotProduction = production[key] || 0;
        const hour = Number(key.match(/(\d\d):/)[1]);
        const action = decideAction(hour, spotPzu, spotProduction, collector);
        progress.push({
            interval: key,
            spotPzu,
            spotProduction,
            action,
            battery:collector.battery,
        });
    }
    return progress;
};

/**
 *
 */
function decideAction(hour, spotPzu, spotProduction, collector){
    if (collector.batteryPercent < 100) {
        // We need to charge
        if (spotProduction) {
            // The sun is up
            return SUN_TO_BATTERY;
        } else {
            // The sun is down and the batteries are not yet full
            return NOTHING;
        }
    } else {
        // The batteries are full
        if (spotProduction) {
            // The sun is up
            if (spotPzu > 0) {
                // Normal PZU price
                return SUN_TO_GRID;
            } else {
                // Negative pricing, DO NOT FEED THE GRID!
                return SUN_TO_TANK;
            }
        } else {
            if (hour >= 19 && spotPzu > 0) {
                // Fertile interval
                return BATTERY_TO_GRID;
            } else {
                // Not a good moment to feed the grid
                return NOTHING;
            }
        }
    }
}