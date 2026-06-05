import { useState, useEffect } from 'react';
import { fetchWeatherApi } from 'openmeteo';
import { colors } from '../theme/theme';

export const useWeather = (latitude: any, longitude: any) => {
  const [forecast, setForecast] = useState<any[]>([]);
  const [loadingWeather, setLoadingWeather] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      console.log("1. Starting Weather Fetch...");
      console.log("2. Coordinates received:", latitude, longitude);

      const lat = Number(latitude);
      const lon = Number(longitude);

      if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) {
        console.warn("3. FAILED: Coordinates are missing or zero.");
        setLoadingWeather(false);
        return;
      }
      
      try {
        const params = {
          latitude: lat,
          longitude: lon,
          daily: ["weather_code", "temperature_2m_max"],
          timezone: "auto",
          forecast_days: 5,
        };
        const url = "https://api.open-meteo.com/v1/forecast";
        
        console.log("4. Fetching from Open-Meteo SDK...");
        const responses = await fetchWeatherApi(url, params);
        const response = responses[0];
        
        const daily = response.daily()!;
        const utcOffsetSeconds = response.utcOffsetSeconds();

        const rawCodes = daily.variables(0)?.valuesArray();
        const rawTemps = daily.variables(1)?.valuesArray();

        if (!rawCodes || !rawTemps) {
          console.warn("5. FAILED: API did not return daily variables.");
          setLoadingWeather(false);
          return;
        }

        console.log("5. SUCCESS! Data received. Parsing arrays safely...");
        
        const weatherCodes = Array.from(rawCodes);
        const maxTemps = Array.from(rawTemps);

        const timeArray = Array.from(
          { length: (Number(daily.timeEnd()) - Number(daily.time())) / daily.interval() },
          (_, i) => new Date((Number(daily.time()) + i * daily.interval() + utcOffsetSeconds) * 1000)
        );

        const formatted = timeArray.map((date, index) => {
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }); 
          const temp = Math.round(maxTemps[index]);
          const code = weatherCodes[index];
          
          let icon = 'cloud-outline';
          let color = colors.textMuted;
          
          if (code === 0) { icon = 'sunny'; color = '#FFD700'; } 
          else if (code > 0 && code < 4) { icon = 'partly-sunny'; color = '#FFA500'; } 
          else if (code >= 51 && code <= 67) { icon = 'rainy'; color = '#4DA8DA'; } 
          else if (code >= 71 && code <= 77) { icon = 'snow'; color = '#AEEEEE'; } 
          else if (code >= 80 && code <= 82) { icon = 'rainy'; color = '#4DA8DA'; } 
          else if (code >= 95) { icon = 'thunderstorm'; color = '#6A5ACD'; } 
          
          return { id: index.toString(), day: dayName, temp: `${temp}°`, icon, color };
        });
        
        setForecast(formatted);
        console.log("6. Weather fully loaded and sent to UI!");

      } catch (error) {
        console.error("SDK Weather fetch error:", error);
      } finally {
        setLoadingWeather(false);
      }
    };
    
    fetchWeather();
  }, [latitude, longitude]);

  return { forecast, loadingWeather };
};