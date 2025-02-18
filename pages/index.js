import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { useState, useEffect, startTransition } from 'react'
import Slider from '@mui/material/Slider'
import { Typography, Container, Divider, Link, Button } from '@mui/material'
import Grid from '@mui/material/Unstable_Grid2'
import { makeStyles } from '@mui/styles'
import humanizeDuration from 'humanize-duration'

import Footer from '../components/Footer'

const useStyle = makeStyles({
    mark: {
        color: 'white'
    },
    button: {
        color: "#6272a4",
        borderColor: "#6272a4",
        '&:hover': {
            color: "#8be9fd",
            borderColor: "#8be9fd",
        },
    }
});

export default function Home() {
    const [data, setData] = useState(null);
    const [ofacRate, setOfacRate] = useState(null);
    const [inclusionRate, setInclusionRate] = useState([]);
    const [waitingPeriod, setWaitingPeriod] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleString());
    const [sliderValue, setSliderValue] = useState(0);
    const [isSliderCustom, setIsSliderCustom] = useState(false);
    const [prevData, setPrevData] = useState(null);
    const [dailyChange, setDailyChange] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [OPtvl, setOPtvl] = useState(null);
    const [ARBtvl, setARBtvl] = useState(null);
    const [tvls, setTvls] = useState(null);

    const handleSliderChange = (event, newValue) => {
        setIsSliderCustom(true);
        setSliderValue(newValue);
    };

    const handleSliderReset = () => {
        setIsSliderCustom(false);
        setSliderValue(ofacRate * 100);
    }

    const classes = useStyle();

    const calculateOfacCompliantRate = (data) => {
        var censoredBlocks = 0;
        for (var relayStat of data.relayStats) {
            if (relayStat.isOfacCensoring) {
                censoredBlocks += relayStat.numBlocks;
            }
        }
        return (censoredBlocks / data.totalBlocks);
    }

    useEffect(() => {
        setIsLoading(true);
        // 1 day period in seconds
        const end_time = new Date().getTime() / 1000;
        const start_time = end_time - 24 * 60 * 60;

        const fetchData = async () => {
            setIsLoading(true);
            const response = await fetch('/api/mevwatch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 'startTime': start_time, 'endTime': end_time }),
            })
            await response.json()
            .then(data => {
                setData(data);
                setLastRefresh(new Date().toLocaleString());
                setFetchError(null);
            })
            .catch(error => {
                console.log(error);
                setFetchError(error);
            });
            setIsLoading(false);
        }

        const fetchDataPrevDay = async () => {
            const response = await fetch('/api/mevwatch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 'startTime': start_time - 24 * 60 * 60, 'endTime': end_time - 24 * 60 * 60 }),
            })
            await response.json()
            .then(oldData => {
                setPrevData(oldData);
            })
            .catch(error => {
                console.log(error);
            });
        }

        fetchData();
        fetchDataPrevDay();

        const t = setInterval(() => {
            fetchData();
            fetchDataPrevDay();
        }, 60 * 1000);

        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if(fetchError && !sliderValue) {
            setLastRefresh("error fetching data, retrying...");
            setSliderValue(50.00);
            setIsSliderCustom(true);
        }
    }, [fetchError, sliderValue]);

    useEffect(() => {
        if (data && prevData) {
            startTransition(() => {
                if(!isSliderCustom) {
                    setOfacRate(calculateOfacCompliantRate(data));
                    setDailyChange(calculateOfacCompliantRate(data) - calculateOfacCompliantRate(prevData));
                    setSliderValue(calculateOfacCompliantRate(data) * 100);
                }
            }
            );
        }
    }, [data, isSliderCustom, prevData]);

    useEffect(() => {
        const block_intervals = [1, 5, 10, 25];
        const inclusion_rates = [0.25, 0.5, 0.75, 0.9999];

        var rate;
        if(!isSliderCustom) {
            rate = ofacRate;
        } else {
            rate = sliderValue / 100;
        }

        var inclusionRates = [];
        for(var interval of block_intervals) {
            var tx_inclusion_rate = 1-(rate**interval);
            inclusionRates.push({blocks: interval, rate: tx_inclusion_rate});
        }
        setInclusionRate(inclusionRates);

        var waitingPeriods = [];
        for(var myRate of inclusion_rates) {
            var waiting_period = Math.ceil(Math.log(1-myRate)/Math.log(rate));
            waitingPeriods.push({rate: myRate, blocks: waiting_period});
        }
        setWaitingPeriod(waitingPeriods);
    }, [ofacRate, isSliderCustom, sliderValue]);

    return (
        <Container className={styles.container} style={{marginTop: '2em'}}>
            <Head>
                <title>inclusion.watch</title>
                <meta name="description" content="inclusion.watch" />
            </Head>
            {!ofacRate && !sliderValue ? (
                <div>Loading...</div>
            ) : (
                <div>
                    <Container maxWidth="lg">
                        <Typography variant="h3" textAlign="center" fontWeight="700">🦹🏼️ INCLUSION<span style={{fontSize: "0em"}}> </span>.WATCH 🔎</Typography>
                        {/* animated keyframes gradient text */}
                        <Grid container direction="row" spacing={0} alignItems="top" justifyContent="center">
                            <Typography variant="h1" fontSize="5em" textAlign="center" className="linear-wipe" fontWeight="700">
                                {
                                    !isSliderCustom 
                                        ? (100*ofacRate).toFixed(2) 
                                        : sliderValue.toFixed(2)
                                }
                                %
                            </Typography>
                            {
                                !isSliderCustom && dailyChange 
                                    ? (
                                        (dailyChange > 0)
                                            ? <Typography textAlign="center" align="center" color="#ff5555">+{(dailyChange*100).toFixed(2)}</Typography>
                                            : <Typography textAlign="center" align="center" color="#50fa7b">{(dailyChange*100).toFixed(2)}</Typography>
                                    ) 
                                    : <></>
                            }
                            
                        </Grid>
                        <Typography variant="h6" textAlign="center">daily avg OFAC compliant blocks</Typography>
                    </Container>
                    <br></br>
                    <Container>
                        <Container align="right">
                            <Button className={classes.button} sx={{ visibility: isSliderCustom ? 'visible' : 'hidden'}} variant="outlined" size="small" onClick={handleSliderReset}>Reset</Button>
                        </Container>
                    {
                        (ofacRate || sliderValue)
                        ? <Slider
                            aria-label="Temperature"
                            defaultValue={53}
                            valueLabelDisplay="auto"
                            marks={[
                                { value: 0, label: '0%'},
                                { value: 25, label: '25%'},
                                { value: (ofacRate * 100), label: '👆'},
                                { value: 50, label: '50%'},
                                { value: 75, label: '75%'},
                                { value: 100, label: '100%'}]}
                            min={0}
                            max={100}
                            sx={{
                                color: '#bd93f9'
                            }}
                            step={0.01}
                            classes={{ markLabel: classes.mark }}
                            value={sliderValue}
                            onChange={handleSliderChange}
                        /> 
                        : <></>
                    }
                    </Container>
                    <Divider sx={{
                        "&::before, &::after": {
                        borderColor: "#6272a4",
                        },
                        mt: "2em"
                    }}>inclusion probability per # of blocks</Divider>
                    <br></br>
                    <Grid container spacing={2}>
                        {
                            inclusionRate.map((rate, index) => {
                                return <Grid xs={6} md={3} key={index}>
                                            <Typography textAlign="center">{rate.blocks} {rate.blocks > 1 ? 'BLOCKS' : 'BLOCK'} </Typography>
                                            <Typography variant="h5" textAlign="center" fontWeight="500">{(100*rate.rate).toFixed(2)}%</Typography>
                                            <Typography textAlign="center">{rate.blocks*12 <= 36 ? '🚀' : rate.blocks*12 <= 90 ? '🚗' :  rate.blocks*12 <= 210 ? '🛵' : '🐌'} — {humanizeDuration(rate.blocks*12*1000)}</Typography>
                                        </Grid>
                            })
                        }
                    </Grid>
                    
                    <br></br>
                    <Divider sx={{
                        "&::before, &::after": {
                        borderColor: "#6272a4",
                        },
                        mt: "2em"
                    }}>waiting time per inclusion probability</Divider>
                    <br></br>
                    <Grid container spacing={2}>
                        {
                            waitingPeriod.map((period, index) => {
                                return <Grid xs={6} md={3} key={index}>
                                            <Typography textAlign="center">{(100*period.rate).toFixed(2)}%</Typography>
                                            <Typography variant="h5" textAlign="center" fontWeight="500">{period.blocks} {period.blocks > 1 ? 'BLOCKS' : 'BLOCK'}</Typography>
                                            <Typography textAlign="center">{period.blocks*12 <= 36 ? '🚀' : period.blocks*12 <= 90 ? '🚗' :  period.blocks*12 <= 210 ? '🛵' : '🐌'} — {humanizeDuration(period.blocks*12*1000)}</Typography>
                                        </Grid>
                            })
                        }
                    </Grid>
                </div>
            )}
            <br></br>
            <Typography textAlign="center" color="#6272a4">Last update: {isLoading ? "loading..." : lastRefresh}</Typography>
            <Footer isLoading={isLoading} lastRefresh={lastRefresh}/>
        </Container>
    )
}
