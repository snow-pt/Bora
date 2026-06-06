import { useState, useEffect } from 'react';
import { fetchWeatherApi } from 'openmeteo';
import { colors } from '../theme/theme';

export const useWeather = (latitude: any, longitude: any) => {
  // State to hold the final array of daily weather objects
  const [forecast, setForecast] = useState<any[]>([]);
  // Tracks if the SDK is currently fetching data
  const [loadingWeather, setLoadingWeather] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      // Sanitize the coordinates
      const lat = Number(latitude);
      const lon = Number(longitude);

      // If a trip was created without coordinates, safely abort the fetch so the app doesn't crash.
      if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) {
        setLoadingWeather(false);
        return;
      }
      
      try {
        // Define the exact parameters for the Open-Meteo SDK
        const params = {
          latitude: lat,
          longitude: lon,
          daily: ["weather_code", "temperature_2m_max"], // We only need the max temp and the icon code
          timezone: "auto",
          forecast_days: 5,
        };
        const url = "https://api.open-meteo.com/v1/forecast";
        
        // Fetch data using Open-Meteo SDK
        const responses = await fetchWeatherApi(url, params);
        const response = responses[0];
        
        const daily = response.daily()!;
        const utcOffsetSeconds = response.utcOffsetSeconds();

        // Extract raw Float32Arrays safely, we assign these to intermediate variables first so TypeScript can track them
        const rawCodes = daily.variables(0)?.valuesArray();
        const rawTemps = daily.variables(1)?.valuesArray();

        // If the API fails and returns null, stop execution safely
        if (!rawCodes || !rawTemps) {
          setLoadingWeather(false);
          return;
        }
        
        // Convert to standard Javascript Arrays
        const weatherCodes = Array.from(rawCodes);
        const maxTemps = Array.from(rawTemps);

        // Calculate the actual Dates based on the SDK interval math
        const timeArray = Array.from(
          { length: (Number(daily.timeEnd()) - Number(daily.time())) / daily.interval() },
          (_, i) => new Date((Number(daily.time()) + i * daily.interval() + utcOffsetSeconds) * 1000)
        );

        // Map the raw data into formatted objects
        const formatted = timeArray.map((date, index) => {
          // Force UTC timeZone so the day doesn't shift depending on the user's phone timezone
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }); 
          const temp = Math.round(maxTemps[index]);
          const code = weatherCodes[index];
          
          let icon = 'cloud-outline';
          let color = colors.textMuted;
          
          // Translating API codes to Ionicons
          // 0: Clear, 1-3: Partly Cloudy, 51-67: Rain, 71-77: Snow, 80-82: Very Rainy, 95+: Thunderstorm
          if (code === 0) { icon = 'sunny'; color = '#FFD700'; } 
          else if (code > 0 && code < 4) { icon = 'partly-sunny'; color = '#FFA500'; } 
          else if (code >= 51 && code <= 67) { icon = 'rainy'; color = '#4DA8DA'; } 
          else if (code >= 71 && code <= 77) { icon = 'snow'; color = '#AEEEEE'; } 
          else if (code >= 80 && code <= 82) { icon = 'rainy'; color = '#4DA8DA'; } 
          else if (code >= 95) { icon = 'thunderstorm'; color = '#6A5ACD'; } 
          
          return { id: index.toString(), day: dayName, temp: `${temp}°`, icon, color };
        });
        
        // Push the final array to state
        setForecast(formatted);

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