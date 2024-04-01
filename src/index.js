function PrayTimes() {
	
	const timeNames = {
		fajr     : 'Fajr',
		sunrise  : 'Sunrise',
		dhuhr    : 'Dhuhr',
		asr      : 'Asr',
		sunset   : 'Sunset',
		maghrib  : 'Maghrib',
		isha     : 'Isha',
		midnight : 'Midnight'
	};


	const methods = {
		Karachi: {
			name: 'University of Islamic Sciences, Karachi',
			params: { fajr: 18, isha: 18 } },
	};


	// Default Parameters in Calculation Methods
	const defaultParams = {
		maghrib: '0 min', midnight: 'Standard'

	};

	const setting = {  
		dhuhr    : '0 min',  
		asr      : 'Standard',
		highLats : 'NightMiddle',
	};

	let timeFormat = '24h';
	const timeSuffixes = ['am', 'pm'];
	const invalidTime =  '-----';
	const numIterations = 1;
	let offset = {};

	let lat, lng, elv, timeZone, jDate;     

	
	for (let i in methods) {
		let params = methods[i].params;
		for (let j in defaultParams)
			if ((typeof(params[j]) == 'undefined'))
				params[j] = defaultParams[j];
	};

	
	for (let i in timeNames)
		offset[i] = 0;

		

	return {

	setMethod(method) {
		if (methods[method]) {
			this.adjust(methods[method].params);
			calcMethod = method;
		}
	},

	adjust(params) {
		for (let id in params)
			setting[id] = params[id];
	},

	getTimes(date, coords, timezone, dst, format) {
		lat = 1* coords[0];
		lng = 1* coords[1]; 
		elv = coords[2] ? 1* coords[2] : 0;
		timeFormat = format || timeFormat;
		if (date.constructor === Date)
			date = [date.getFullYear(), date.getMonth()+ 1, date.getDate()];
		if (typeof(timezone) == 'undefined' || timezone == 'auto')
			timezone = this.getTimeZone(date);
		if (typeof(dst) == 'undefined' || dst == 'auto') 
			dst = this.getDst(date);
		timeZone = 1* timezone+ (1* dst ? 1 : 0);
		jDate = this.julian(date[0], date[1], date[2])- lng/ (15* 24);
		
		return this.computeTimes();
	},


	getFormattedTime(time, format, suffixes) {
		if (isNaN(time))
			return invalidTime;
		if (format == 'Float') return time;
		suffixes = suffixes || timeSuffixes;

		time = DMath.fixHour(time+ 0.5/ 60);  
		let hours = Math.floor(time); 
		let minutes = Math.floor((time- hours)* 60);
		let suffix = (format == '12h') ? suffixes[hours < 12 ? 0 : 1] : '';
		let hour = (format == '24h') ? this.twoDigitsFormat(hours) : ((hours+ 12 -1)% 12+ 1);
		return hour+ ':'+ this.twoDigitsFormat(minutes)+ (suffix ? ' '+ suffix : '');
	},




	midDay(time) {
		let eqt = this.sunPosition(jDate+ time).equation;
		let noon = DMath.fixHour(12- eqt);
		return noon;
	},


	sunAngleTime(angle, time, direction) {
		let decl = this.sunPosition(jDate+ time).declination;
		let noon = this.midDay(time);
		let t = 1/15* DMath.arccos((-DMath.sin(angle)- DMath.sin(decl)* DMath.sin(lat))/ 
				(DMath.cos(decl)* DMath.cos(lat)));
		return noon+ (direction == 'ccw' ? -t : t);
	},


	asrTime(factor, time) { 
		let decl = this.sunPosition(jDate+ time).declination;
		let angle = -DMath.arccot(factor+ DMath.tan(Math.abs(lat- decl)));
		return this.sunAngleTime(angle, time);
	},


	sunPosition(jd) {
		let D = jd - 2451545.0;
		let g = DMath.fixAngle(357.529 + 0.98560028* D);
		let q = DMath.fixAngle(280.459 + 0.98564736* D);
		let L = DMath.fixAngle(q + 1.915* DMath.sin(g) + 0.020* DMath.sin(2*g));

		let R = 1.00014 - 0.01671* DMath.cos(g) - 0.00014* DMath.cos(2*g);
		let e = 23.439 - 0.00000036* D;

		let RA = DMath.arctan2(DMath.cos(e)* DMath.sin(L), DMath.cos(L))/ 15;
		let eqt = q/15 - DMath.fixHour(RA);
		let decl = DMath.arcsin(DMath.sin(e)* DMath.sin(L));

		return {declination: decl, equation: eqt};
	},


	julian(year, month, day) {
		if (month <= 2) {
			year -= 1;
			month += 12;
		};
		let A = Math.floor(year/ 100);
		let B = 2- A+ Math.floor(A/ 4);

		let JD = Math.floor(365.25* (year+ 4716))+ Math.floor(30.6001* (month+ 1))+ day+ B- 1524.5;
		return JD;
	},

	


	computePrayerTimes(times) {
		times = this.dayPortion(times);
		let params  = setting;
		
		let fajr    = this.sunAngleTime(this.parseInt(params.fajr), times.fajr, 'ccw');
		let sunrise = this.sunAngleTime(this.riseSetAngle(), times.sunrise, 'ccw');  
		let dhuhr   = this.midDay(times.dhuhr);
		let asr     = this.asrTime(this.asrFactor(params.asr), times.asr);
		let sunset  = this.sunAngleTime(this.riseSetAngle(), times.sunset);;
		let maghrib = this.sunAngleTime(this.parseInt(params.maghrib), times.maghrib);
		let isha    = this.sunAngleTime(this.parseInt(params.isha), times.isha);

		return {
			fajr: fajr, sunrise: sunrise, dhuhr: dhuhr, 
			asr: asr, sunset: sunset, maghrib: maghrib, isha: isha
		};
	},


	computeTimes() {
		let times = { 
			fajr: 5, sunrise: 6, dhuhr: 12, 
			asr: 13, sunset: 18, maghrib: 18, isha: 18
		};

		for (let i=1 ; i<=numIterations ; i++) 
			times = this.computePrayerTimes(times);

		times = this.adjustTimes(times);
		
		times.midnight = (setting.midnight == 'Jafari') ? 
				times.sunset+ this.timeDiff(times.sunset, times.fajr)/ 2 :
				times.sunset+ this.timeDiff(times.sunset, times.sunrise)/ 2;

		times = this.tuneTimes(times);
		return this.modifyFormats(times);
	},


	adjustTimes(times) {
		let params = setting;
		for (let i in times)
			times[i] += timeZone- lng/ 15;
			
		if (params.highLats != 'None')
			times = this.adjustHighLats(times);
	
		if (this.isMin(params.maghrib))
			times.maghrib = times.sunset+ parseFloat(params.maghrib)/ 60;
		if (this.isMin(params.isha))
			times.isha = times.maghrib+ this.parseInt(params.isha)/ 60;
		times.dhuhr += this.parseInt(params.dhuhr)/ 60; 

		return times;
	},


	asrFactor(asrParam) {
		let factor = {Standard: 1, Hanafi: 2}[asrParam];
		return factor || this.parseInt(asrParam);
	},


	riseSetAngle() {
		let angle = 0.0347* Math.sqrt(elv); 
		return 0.833+ angle;
	},

	tuneTimes(times) {
		for (let i in times)
			times[i] += offset[i]/ 60; 
		return times;
	},


	modifyFormats(times) {
		for (let i in times)
			times[i] = this.getFormattedTime(times[i], timeFormat); 
		return times;
	},


	adjustHighLats(times) {
		let params = setting;
		let nightTime = this.timeDiff(times.sunset, times.sunrise); 

		
		times.fajr  = this.adjustHLTime(times.fajr, times.sunrise, parseFloat(params.fajr), nightTime, 'ccw');
		times.isha  = this.adjustHLTime(times.isha, times.sunset, parseFloat(params.isha), nightTime);
		times.maghrib = this.adjustHLTime(times.maghrib, times.sunset, parseFloat(params.maghrib), nightTime);
		
		return times;
	},

	
	adjustHLTime(time, base, angle, night, direction) {
		let portion = this.nightPortion(angle, night);
		let timeDiff = (direction == 'ccw') ? 
			this.timeDiff(time, base):
			this.timeDiff(base, time);
		if (isNaN(time) || timeDiff > portion) 
			time = base+ (direction == 'ccw' ? -portion : portion);
		return time;
	},

	
	nightPortion(angle, night) {
		let method = setting.highLats;
		let portion = 1/2 // MidNight
		if (method == 'AngleBased')
			portion = 1/60* angle;
		if (method == 'OneSeventh')
			portion = 1/7;
		return portion* night;
	},


	dayPortion(times) {
		for (let i in times)
			times[i] /= 24;
		return times;
	},

	getTimeZone(date) {
		let year = date[0];
		let t1 = this.gmtOffset([year, 0, 1]);
		let t2 = this.gmtOffset([year, 6, 1]);
		return Math.min(t1, t2);
	},

	
	getDst(date) {
		return 1* (this.gmtOffset(date) != this.getTimeZone(date));
	},


	gmtOffset(date) {
		let localDate = new Date(date[0], date[1]- 1, date[2], 12, 0, 0, 0);
		let GMTString = localDate.toGMTString();
		let GMTDate = new Date(GMTString.substring(0, GMTString.lastIndexOf(' ')- 1));
		let hoursDiff = (localDate- GMTDate) / (1000* 60* 60);
		return hoursDiff;
	},

	

	parseInt(str) {
		return 1* (str+ '').split(/[^0-9.+-]/)[0];
	},


	isMin(arg) {
		return (arg+ '').indexOf('min') != -1;
	},


	timeDiff(time1, time2) {
		return DMath.fixHour(time2- time1);
	},


	twoDigitsFormat(num) {
		return (num <10) ? '0'+ num : num;
	}
	
}}


const DMath = {

	dtr: function(d) { return (d * Math.PI) / 180.0; },
	rtd: function(r) { return (r * 180.0) / Math.PI; },

	sin: function(d) { return Math.sin(this.dtr(d)); },
	cos: function(d) { return Math.cos(this.dtr(d)); },
	tan: function(d) { return Math.tan(this.dtr(d)); },

	arcsin: function(d) { return this.rtd(Math.asin(d)); },
	arccos: function(d) { return this.rtd(Math.acos(d)); },
	arctan: function(d) { return this.rtd(Math.atan(d)); },

	arccot: function(x) { return this.rtd(Math.atan(1/x)); },
	arctan2: function(y, x) { return this.rtd(Math.atan2(y, x)); },

	fixAngle: function(a) { return this.fix(a, 360); },
	fixHour:  function(a) { return this.fix(a, 24 ); },

	fix: function(a, b) { 
		a = a - b* (Math.floor(a/ b));
		return (a < 0) ? a+ b : a;
	}
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

let date = new Date();
const currentDay = date.getDate();

const selectedDate = document.getElementById("selectedDate");
selectedDate.innerHTML = `Today | ${date.getDate()} ${months[date.getMonth()]}`;

let finalDate = date;

let finalCoordinates;

const locationPreview = document.getElementById('locationButton');
const displayedCurrentCoordinates = document.getElementById('displayedCurrentCoordinates');
const existingLocation = localStorage.getItem('location');
const existingCoordinates = JSON.parse(existingLocation);
const locationData = existingLocation || "Mecca";

displayedCurrentCoordinates.innerHTML = `Current Coordinates: ${existingCoordinates[0]}, ${existingCoordinates[1]}`

try {

	finalCoordinates = [existingCoordinates[0], existingCoordinates[1]];
	locationPreview.innerText = "Custom";
	
} catch(e) {
	
	locationPreview.innerText = locationData;
	finalCoordinates = [21.42, 39.81];
	
}

const bells = document.querySelectorAll(".time > button");
const existingNotifications = JSON.parse(localStorage.getItem('notifications')) || [];

bells.forEach(bell => {
	if (existingNotifications[bell.id]) bell.innerText = "notifications";
});


const prayTimes = new PrayTimes();
prayTimes.setMethod("Karachi");
let time = prayTimes.getTimes(finalDate, finalCoordinates);


function openLocationDialog() {
	const list = document.getElementById("locationDialog");
	list.open = true;

}

function closeLocationDialog() {
	const list = document.getElementById("locationDialog");
	list.open = false;
}


const fajr = document.getElementById('fajr');
fajr.innerText = time.fajr;

const sunrise = document.getElementById('sunrise');
sunrise.innerText = time.sunrise;

const dhuhr = document.getElementById('dhuhr');
dhuhr.innerText = time.dhuhr;

const asr = document.getElementById('asr');
asr.innerText = time.asr ;

const maghrib = document.getElementById('maghrib');
maghrib.innerText = time.maghrib ;

const isha = document.getElementById("isha");
isha.innerText = time.isha ;



function previousDate() {
	date.setDate(date.getDate() - 1);
	const newTimes = prayTimes.getTimes(finalDate, finalCoordinates);
	fajr.innerText = newTimes.fajr;
	sunrise.innerText = newTimes.sunrise;
	dhuhr.innerText = newTimes.dhuhr;
	asr.innerText = newTimes.asr;
	maghrib.innerText = newTimes.maghrib;
	isha.innerText = newTimes.isha;

	if(date.getDate() === currentDay) {
		selectedDate.innerHTML = `Today | ${date.getDate()} ${months[date.getMonth()]}`;
	} else {
	
	selectedDate.innerHTML = `${weekDay[date.getDay()]} | ${date.getDate()} ${months[date.getMonth()]}`;
	}
}

function nextDate() {
	date.setDate(date.getDate() + 1);
	const newTimes = prayTimes.getTimes(finalDate, finalCoordinates);
	fajr.innerText = newTimes.fajr ;
	sunrise.innerText = newTimes.sunrise ;
	dhuhr.innerText = newTimes.dhuhr ;
	asr.innerText = newTimes.asr ;
	maghrib.innerText = newTimes.maghrib ;
	isha.innerText = newTimes.isha ;

	if(date.getDate() === currentDay) {
		selectedDate.innerHTML = `Today | ${date.getDate()} ${months[date.getMonth()]}`;
	} else {
	
	selectedDate.innerHTML = `${weekDay[date.getDay()]} | ${date.getDate()} ${months[date.getMonth()]}`;
	}
}


function timeDiff(currentTime, targetTime, nextPrayer) {

	const cMinutes = Math.floor((currentTime % 1) * 100) + (Math.floor(currentTime) * 60);
	const tMinutes = Math.floor((targetTime % 1) * 100) + (Math.floor(targetTime) * 60);

	const diff = tMinutes - cMinutes;

	const hours = Math.floor(diff / 60);
	const minutes = diff % 60;
	
	let output;

	if(hours > 1) {

		output = `${hours} hrs ${minutes} mins until ${nextPrayer}`;

	} else if(hours == 1) {

		output = `${hours} hr ${minutes} mins until ${nextPrayer}`;

	} else if(hours > 1 && minutes == 0) {
		output = `${hours} hrs until ${nextPrayer}`;

	} else if(hours == 1 && minutes == 0) {
		output = `${hours} hr until ${nextPrayer}`;

	} else if(hours == 0 && minutes == 0) {
		output = "";

	} else if(hours == 0 && minutes == 1) {
		output = `1 minute remaining until ${nextPrayer}`
	} else {

		output = `${minutes} mins until ${nextPrayer}`;

	}
	

	return output;

}



function updateUi() {
	const activePrayer = document.getElementById("activePrayer");
	const remaining = document.getElementById("remaining");

	const fajrNotification = document.getElementById("fajrNotification");
	const sunriseNotification = document.getElementById("sunriseNotification");
	const dhuhrNotification = document.getElementById("dhuhrNotification");
	const asrNotification = document.getElementById("asrNotification");
	const maghribNotification = document.getElementById("maghribNotification");
	const ishaNotification = document.getElementById("ishaNotification");

	const newDate = new Date();
	let currentMinutes = newDate.getMinutes();
	let currentHour = newDate.getHours();
	
	if (currentHour == "0") {
		currentHour = 24;
	}
	if (currentMinutes < 10) {
		currentMinutes = "0" + currentMinutes;
	}
	
	const currentTime = currentHour + '.' + currentMinutes;
	
	const currentFajr = fajr.innerText.split(":").join(".");
	const currentSunrise = sunrise.innerText.split(":").join(".");
	const currentDhuhr = dhuhr.innerText.split(":").join(".");
	const currentAsr = asr.innerText.split(":").join(".");
	const currentMaghrib = maghrib.innerText.split(":").join(".");
	const currentIsha = isha.innerText.split(":").join(".");
	
	let currentPrayer = '';
	let remainingTime;
	
	if (currentTime >= currentFajr && currentTime < currentSunrise) {
		currentPrayer = "Fajr";
		remainingTime = timeDiff(currentTime, currentSunrise, "Sunrise");

		const fajr = document.getElementById("activeFajr");
		const isha = document.getElementById("activeIsha");
		isha.style.border = "solid 2px #f1c40f";
		fajr.style.border = "solid 4px #f1c40f";


	} else if(currentTime >= currentSunrise && currentTime < currentDhuhr) {
		currentPrayer = "Duha";
		remainingTime = timeDiff(currentTime, currentDhuhr, "Dhuhr");

		const sunrise = document.getElementById("activeSunrise");
		const fajr = document.getElementById("activeFajr");
		fajr.style.border = "solid 2px #f1c40f";
		sunrise.style.border = "solid 4px #f1c40f";
		

	} else if(currentTime >= currentDhuhr && currentTime < currentAsr) {
		currentPrayer = "Dhuhr";
		remainingTime = timeDiff(currentTime, currentAsr, "Asr");

		const dhuhr = document.getElementById("activeDhuhr");
		const sunrise  = document.getElementById("activeSunrise");
		sunrise.style.border = "solid 2px #f1c40f";
		dhuhr.style.border = "solid 4px #f1c40f";


	} else if(currentTime >= currentAsr && currentTime < currentMaghrib) {
		currentPrayer = "Asr";
		remainingTime = timeDiff(currentTime, currentMaghrib, "Maghrib");

		const asr = document.getElementById("activeAsr");
		const dhuhr = document.getElementById("activeDhuhr");
		dhuhr.style.border = "solid 2px #f1c40f";
		asr.style.border = "solid 4px #f1c40f";
		

	} else if(currentTime >= currentMaghrib && currentTime < currentIsha) {
		currentPrayer = "Maghrib";
		remainingTime = timeDiff(currentTime, currentIsha, "Isha");

		const maghrib = document.getElementById("activeMaghrib");
		const asr = document.getElementById("activeAsr");
		asr.style.border = "solid 2px #f1c40f";
		maghrib.style.border = "solid 4px #f1c40f";
		

	} else {
		currentPrayer = "Isha";
		if (currentTime >= currentFajr) {
			const fajrHours = (24 - Math.floor(currentTime)) + (Math.floor(currentFajr)) + Math.floor(currentTime);
			const fajrMinutes = Math.round((currentFajr % 1) * 100);
	
			const fajrTime = fajrHours + "." + fajrMinutes;
			remainingTime = timeDiff(currentTime, fajrTime, "Fajr");
		} else {

			remainingTime = timeDiff(currentTime, currentFajr, "Fajr");
		}

		const isha = document.getElementById("activeIsha");
		const maghrib = document.getElementById("activeMaghrib");
		maghrib.style.border = "solid 2px #f1c40f";
		isha.style.border = "solid 4px #f1c40f";

	}
	
	activePrayer.innerText = currentPrayer;
	remaining.innerText = remainingTime;

	if (currentTime >= currentFajr && currentTime < currentMaghrib) {

		const body = document.getElementById("body");
		const planet = document.getElementById("planet");
		const header = document.getElementById("header");

		
		body.className = "bodyDayTimeMode";
		planet.className = "sun";
		header.className = "headerDayTime";

	} else {

		const body = document.getElementById("body");
		const planet = document.getElementById("planet");
		const header = document.getElementById("header");
		const location = document.getElementById("location");
		const icons = document.getElementsByClassName("material-icons");
		const back = document.querySelector(".back");
		const current = document.querySelector(".current");
		const next = document.querySelector(".next");
		const locationButton = document.getElementById("locationButton");

		body.className = "bodyNightTimeMode";
		planet.className = "moon";
		header.className = "headerNightTime";
		location.style.color = "white";

		for(let i = 0; i < 8; i++) {
			icons[i].style.color = "white";
		
		}

		back.style.color = "white";
		current.style.color = "white";
		next.style.color = "white";
		locationButton.style.color = "white";
		

	}

	if(fajrNotification.innerText === "notifications" && currentTime == currentFajr) {
		new window.Notification("Good Morning", {body: "It is time to pray Fajr"});

	} else if(sunriseNotification.innerText === "notifications" && currentTime == currentSunrise) {
		new window.Notification("Good Morning", {body: "The sun has risen"});

	} else if(dhuhrNotification.innerText === "notifications" && currentTime == currentDhuhr) {
		new window.Notification("Good Evening", {body: "It is time to pray Dhuhr"});

	} else if(asrNotification.innerText === "notifications" && currentTime == currentAsr) {
		new window.Notification("Good Evening", {body: "It is time to pray Asr"});

	} else if(maghribNotification.innerText === "notifications" && currentTime == currentMaghrib) {
		new window.Notification("Good Afternoon", {body: "It is time to pray Maghrib"});

	} else if(ishaNotification.innerText === "notifications" && currentTime == currentIsha) {
		new window.Notification("Good Afternoon", {body: "It is time to pray Isha"});

	}

}

function confirmLocation() {
	const displayedLocation = document.getElementById("locationButton");
	const dialog = document.getElementById("locationDialog");
	const latitude = document.querySelectorAll("dialog > input")[0].value;
	const longitude = document.querySelectorAll("dialog >input")[1].value;


	let finalDisplayedLocation;

		
	if(latitude.trim() == "" || longitude.trim() == "" || isNaN(latitude) || isNaN(longitude)) {

		finalCoordinates = [21.42, 39.81];
		finalDisplayedLocation = "Mecca";
		displayedCurrentCoordinates.innerHTML = 'Current Coordinates: 21.42, 39.81';
		localStorage.setItem('location', JSON.stringify(finalCoordinates));

		updateUi();

		
			
	} else {
		
		finalCoordinates = [latitude, longitude];
		finalDisplayedLocation = "Custom";
		displayedCurrentCoordinates.innerHTML = 'Current Coordinates: ' + finalCoordinates[0] + ', ' + finalCoordinates[1];

		localStorage.setItem('location', JSON.stringify(finalCoordinates));
		dialog.open = false;

	} 
	
		displayedLocation.innerHTML = finalDisplayedLocation;

		const newLocation = prayTimes.getTimes(finalDate, finalCoordinates);
		fajr.innerText = newLocation.fajr;
		sunrise.innerText = newLocation.sunrise;
		dhuhr.innerText = newLocation.dhuhr;
		asr.innerText = newLocation.asr;
		maghrib.innerText = newLocation.maghrib;
		isha.innerText = newLocation.isha;

		updateUi();
	
}

const citations = [
	"اللّهُـمَّ إِنِّـي أَسْأَلُـكَ عِلْمـاً نافِعـاً وَرِزْقـاً طَيِّـباً ، وَعَمَـلاً مُتَقَـبَّلاً",
	"Oh Allah, I ask you for useful knowledge, good provision, and acceptable deeds.",
	
	"اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ.",
	"Oh Allah, help me to mention you, thank you, and well worshipping you",
	
	
	"اللّهُـمَّ أَنْـتَ السَّلامُ ، وَمِـنْكَ السَّلام ، تَبارَكْتَ يا ذا الجَـلالِ وَالإِكْـرام .",
	" Oh Allah, you are peace, and from you is peace. Blessed are you, O possessor of majesty and honor.",
	
	"اللّهُـمَّ لا مانِعَ لِما أَعْطَـيْت، وَلا مُعْطِـيَ لِما مَنَـعْت، وَلا يَنْفَـعُ ذا الجَـدِّ مِنْـكَ الجَـد",
	"Oh Allah, there is no objection to what You have given, nor one who gives what You have withheld, and no one can benefit from your earnestness.",
	
	"لا حَـوْلَ وَلا قـوَّةَ إِلاّ بِاللهِ، لا إلهَ إلاّ اللّـه، وَلا نَعْـبُـدُ إِلاّ إيّـاه, لَهُ النِّعْـمَةُ وَلَهُ الفَضْل وَلَهُ الثَّـناءُ الحَـسَن، لا إلهَ إلاّ اللّهُ مخْلِصـينَ لَـهُ الدِّينَ وَلَوْ كَـرِهَ الكـافِرون.", 
	"There is no power nor strength except with Allah, there is no god but Allah, and we worship none but Him. To Him belongs the blessing, and to Him is the bounty, and to Him is the good praise. There is no god but Allah, sincere in religion to Him, even if The disbelievers rejected him.",
	
	"رَضيـتُ بِاللهِ رَبَّـاً وَبِالإسْلامِ ديـناً وَبِمُحَـمَّدٍ صلى الله عليه وسلم نَبِيّـاً",
	"I am satisfied with Allah as Lord, with Islam as religion, and with Muhammad, may God bless him and grant him peace, as Prophet.",
	
	"اللّهُـمَّ إِنِّـي أَصْبَـحْتُ أُشْـهِدُك ، وَأُشْـهِدُ حَمَلَـةَ عَـرْشِـك ، وَمَلَائِكَتَكَ ، وَجَمـيعَ خَلْـقِك ، أَنَّـكَ أَنْـتَ اللهُ لا إلهَ إلاّ أَنْـتَ وَحْـدَكَ لا شَريكَ لَـك ، وَأَنَّ ُ مُحَمّـداً عَبْـدُكَ وَرَسـولُـك",
	"Oh Allah, in the morning I bear witness to You, and I bear witness to the bearers of Your throne, and to Your angels, and to all of Your creation, that You are God. There is no god but You alone, with no partner. Yours, and that Muhammad is Your servant and Messenger",
	
	"بِسـمِ اللهِ الذي لا يَضُـرُّ مَعَ اسمِـهِ شَيءٌ في الأرْضِ وَلا في السّمـاءِ وَهـوَ السّمـيعُ العَلـيم",
	"In the name of Allah, with whose name nothing can be harmed on earth or in heaven, and He is the All-Hearing, the All-Knowing.",
	
	"سُبْحـانَ اللهِ وَبِحَمْـدِهِ عَدَدَ خَلْـقِه ، وَرِضـا نَفْسِـه ، وَزِنَـةَ عَـرْشِـه ، وَمِـدادَ كَلِمـاتِـه",
	"Glory be to Allah, and praise be to Him according to the number of His creation, the satisfaction of Himself, the weight of His Throne, and the ink of His words.",
	
	"حَسْبِـيَ اللّهُ لا إلهَ إلاّ هُوَ عَلَـيهِ تَوَكَّـلتُ وَهُوَ رَبُّ العَرْشِ العَظـيم",
	"Allah is sufficient for me, there is no god but Him, in Him I put my trust, and He is the Lord of the Great Throne."];

function generateCitation() {
	const arabicCitation = document.getElementById('arabicCitation');
	const englishCitation = document.getElementById('englishCitation');

	let i = Math.floor(Math.random() * 10);

	if(i % 2 !== 0) {
		i++;
	}

	arabicCitation.innerText = citations[i];
	englishCitation.innerText = citations[i + 1];
}

let notifications = {
	"fajrNotification": false,
	"sunriseNotification": false,
	"dhuhrNotification": false,
	"asrNotification": false,
	"maghribNotification": false,
	"ishaNotification": false,
};

function toggleNotification(bell) {

	const activeNotifications = document.querySelectorAll(".time > button");

    if(bell.innerText !== 'notifications') {
		notifications[bell.id] = true;
		bell.innerText = 'notifications';
		

    } else {

		bell.innerText = 'notifications_none';
		notifications[bell.id] = false;
	}

	activeNotifications.forEach(notif => {
		if (notif.innerText === "notifications") {
			notifications[notif.id] = true;
		} else {
			notifications[notif.id] = false;
		}
	});
	localStorage.setItem("notifications", JSON.stringify(notifications));
}

function closeWindow() {
	window.close();
}

setInterval(updateUi, 60000);
setInterval(generateCitation, 1800000);

updateUi();
generateCitation();
