const btnunits=document.getElementById("btn-units");
const menu=document.getElementById("units-menu-panel");
btnunits.addEventListener("click",function(){
       menu.hidden=!menu.hidden;
})
const btnSearch = document.getElementById("btn-search");
const cityInput = document.getElementById("city-input");

btnSearch.addEventListener("click", () => searchCity(cityInput.value));
cityInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        searchCity(cityInput.value);
    }
});

let hourlyForecast;
let hourlyCurrentTime;
const hourlyDaySelect = document.querySelector("#hourly-day");
hourlyDaySelect.addEventListener("change", () => {
    if (hourlyForecast) {
        renderHourlyForecast(hourlyForecast, hourlyCurrentTime);
    }
});

searchCity("Tunis");

async function searchCity(city) {
    const cityName = city.trim();
    if (!cityName) {
        alert("Veuillez saisir une ville.");
        return;
    }

    try {
        const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=fr&format=json`;
        const geocodingResponse = await fetch(geocodingUrl);
        if (!geocodingResponse.ok) {
            throw new Error(`Erreur de géocodage : ${geocodingResponse.status}`);
        }

        const geocodingData = await geocodingResponse.json();
        if (!geocodingData.results || geocodingData.results.length === 0) {
            alert("Ville introuvable !");
            return;
        }

        const cityData = geocodingData.results[0];
        await getWeather(cityData.latitude, cityData.longitude);
        document.getElementById("place").textContent = [cityData.name, cityData.country]
            .filter(Boolean)
            .join(", ");
    } catch (error) {
        console.error("Erreur :", error);
        alert("Impossible de rechercher cette ville.");
    }
}

async function getWeather(latitude, longitude) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,precipitation&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Erreur météo : ${response.status}`);
    }

    const data = await response.json();
    document.getElementById("temp").textContent = `${data.current.temperature_2m}°C`;
    document.getElementById("Feels like").textContent = `${data.current.apparent_temperature}°C`;
    document.getElementById("Humidity").textContent = `${data.current.relative_humidity_2m}%`;
    document.getElementById("Wind").textContent = `${data.current.wind_speed_10m}km/h`;
    document.getElementById("Precipitation").textContent = `${data.current.precipitation}mm`;

    const currentDate = new Date(`${data.current.time.slice(0, 10)}T12:00:00Z`);
    document.getElementById("date").textContent = currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC"
    });

    displayDailyForecast(data.daily);
    displayHourlyForecast(data.hourly, data.current.time);
}

function getWeatherIcon(code) {
    if (code === 0) return "assets/images/icon-sunny.webp";
    if (code === 1 || code === 2) return "assets/images/icon-partly-cloudy.webp";
    if (code === 3) return "assets/images/icon-overcast.webp";
    if ([45, 48].includes(code)) return "assets/images/icon-fog.webp";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "assets/images/icon-rain.webp";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "assets/images/icon-snow.webp";
    if ([95, 96, 99].includes(code)) return "assets/images/icon-storm.webp";

    return "🌡️";
}

function displayDailyForecast(daily) {
    const container = document.querySelector(".daily-contain");

    container.innerHTML = "";

    for (let i = 0; i < daily.time.length; i++) {
        const date = new Date(`${daily.time[i]}T12:00:00`);

        const day = date.toLocaleDateString("en-US", {
            weekday: "short"
        });

        const max = Math.round(daily.temperature_2m_max[i]);
        const min = Math.round(daily.temperature_2m_min[i]);
        const icon = getWeatherIcon(daily.weather_code[i]);

        container.innerHTML += `
            <div class="daily">
                <p>${day}</p>
                <img src="${icon}" alt="Weather icon" class="daily-icon">
                <div class="daily-temperatures">
                    <span>${max}°</span>
                    <span>${min}°</span>
                </div>
            </div>
        `;
    }
}
function displayHourlyForecast(hourly, currentTime) {
    hourlyForecast = hourly;
    hourlyCurrentTime = currentTime;
    const firstForecastDate = new Date(`${hourly.time[0].slice(0, 10)}T00:00:00Z`);

    Array.from(hourlyDaySelect.options).forEach((option, offset) => {
        const date = new Date(firstForecastDate);
        date.setUTCDate(date.getUTCDate() + offset);
        option.textContent = date.toLocaleDateString("en-US", {
            weekday: "long",
            timeZone: "UTC"
        });
    });

    renderHourlyForecast(hourly, currentTime);
}

function renderHourlyForecast(hourly, currentTime) {
    const container = document.querySelector(".hourly-list");
    container.innerHTML = "";

    const selectedDay = Number(hourlyDaySelect.value);
    const firstForecastDate = new Date(`${hourly.time[0].slice(0, 10)}T00:00:00Z`);
    const selectedDate = new Date(firstForecastDate);
    selectedDate.setUTCDate(selectedDate.getUTCDate() + selectedDay);
    const dateKey = selectedDate.toISOString().slice(0, 10);
    const indexes = [];

    hourly.time.forEach((time, index) => {
        if (time.startsWith(dateKey)) {
            indexes.push(index);
        }
    });

    let startIndex = 0;
    if (selectedDay === 0) {
        startIndex = indexes.findIndex(index => hourly.time[index] >= currentTime);
        if (startIndex === -1) {
            return;
        }
    }

    const hoursToDisplay = indexes.slice(startIndex, startIndex + 8);
    hoursToDisplay.forEach(index => {
        const date = new Date(`${hourly.time[index]}Z`);
        const hour = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: "UTC"
        });
        const temperature = Math.round(hourly.temperature_2m[index]);
        const icon = getWeatherIcon(hourly.weather_code[index]);
        const item = document.createElement("li");
        item.classList.add("hourly-item");

        item.innerHTML = `
            <img src="${icon}" alt="" />
            <span>${hour}</span>
            <span>${temperature}°</span>
        `;

        container.appendChild(item);
    });
}

   
    
    
