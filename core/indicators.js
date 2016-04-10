/**
 * Indicator component
 */

"use strict"

class Indicators {

    /**
     * Calculate exponential moving average
     */
    ema(ohlc, length) {
        
        var lastEMA, ema = [];
        var multiplier = 2 / (length + 1);

        for (var i=0; i<ohlc.length;i++) {
            
            var value = ohlc[i];

            if (i < length) {
                lastEMA = value;
            } else {
                lastEMA = (value * multiplier) + (lastEMA * (1 - multiplier));
            }
            ema[i] = lastEMA;
        }

        return ema;

    }

    /**
     * Parabolic SAR with separate startAF and incrementAF params
     */
    sar(ohlc, startAF, incAF, maxAF) {
        
        var bull = true;

        var af   = startAF;
        var ep   = ohlc.low[0];
        var hp   = ohlc.high[0];
        var lp   = ohlc.low[0];

        var psar = ohlc.close.slice();

        for (var i=2; i<ohlc.close.length; i++) {
            
            if (bull)
                psar[i] = psar[i-1] + (af * (hp - psar[i-1]));
            else
                psar[i] = psar[i-1] + (af * (lp - psar[i-1]));

            var reverse = false;

            if (bull) {
                
                if (ohlc.low[i] < psar[i]) {
                    bull    = false;
                    reverse = true;
                    psar[i] = hp;
                    lp      = ohlc.low[i];
                    af      = startAF;
                }

            } else {

                if (ohlc.high[i] > psar[i]) {
                    bull    = true;
                    reverse = true;
                    psar[i] = lp;
                    hp      = ohlc.high[i];
                    af      = startAF;
                }

            }
            
            if (!reverse) {
                
                if (bull) {
                    
                    if (ohlc.high[i] > hp) {
                        hp = ohlc.high[i];
                        af = Math.min(af + incAF, maxAF);
                    }
                    
                    if (ohlc.low[i - 1] < psar[i])
                        psar[i] = ohlc.low[i - 1];
                    
                    if (ohlc.low[i - 2] < psar[i])
                        psar[i] = ohlc.low[i - 2];

                } else {
                    
                    if (ohlc.low[i] < lp) {
                        lp = ohlc.low[i];
                        af = Math.min(af + incAF, maxAF);
                    }
                    
                    if (ohlc.high[i - 1] > psar[i])
                        psar[i] = ohlc.high[i - 1];

                    if (ohlc.high[i - 2] > psar[i])
                        psar[i] = ohlc.high[i - 2];

                }
            
            }

        }

        return psar;

    }

};

module.exports = () => new Indicators();

