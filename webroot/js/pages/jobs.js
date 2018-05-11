/*
 * Script that interacts with various APIs; prints summary
 * stats to the Jobs tile on home page, and prints detailed
 * info to the Jobs detail page.
 *
 * Author: Kellan Nealy + contributors
 */

// Global vars
var avg_rating;
var indeed_query = "";
var job_radius_miles = 1;
var job_type = "fulltime";
var limit = 1000;
var cur_zip = 98117;

// Glassdoor vars and JSON to avoid redundant API requests
var total_company_requests = 0;
var total_companies_recieved = 0;
var glassdoor_companies = [];

// Glassdoor vars to calculate average company rating
var total_matches_with_rating = 0;
var rating_sum = 0.0;

// Indeed JSON to avoid redundant API requests
var indeed_jobs_json;
var indeed_jobs_array;
var indeed_total_jobs = 0;

// Stats
var jobs_in_area;
var avg_company_rating;
var industry_popularity = new Map();


// handler function for Jobs Detail Page, passes html to both callbacks.
// UPDATE: now supports async calling from anywhere in KnowSeattle.
function getJobsData(loc, success, error) {
   console.log("getJobsData function called here");
   console.log("loc.lat:  " + loc.lat);
   console.log("loc.lon: " + loc.lng);

   var indeed_options = getIndeedOptions(cur_zip);


   var url = "https://api.indeed.com/ads/apisearch" + indeed_options;
   console.log(url);

   /*var xhttp = new XMLHttpRequest();
   xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
         success(this.responseText);
         document.getElementById("leftContentDiv").innerHTML = this.responseText;
      }
      else {
         error("there was an error loading your http request");
      }
   };
   xhttp.open("GET", url, true);
   console.log(xhttp);
   xhttp.onerror = function() {
      console.log("An error occurred opening the http request:");
      error("n error occurred opening the http request:.");
   };*/

   var xmlhttp = new XMLHttpRequest();

   xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState == XMLHttpRequest.DONE) { // XMLHttpRequest.DONE == 4
         if (xmlhttp.status == 200) {
            document.getElementById("myDiv").innerHTML = xmlhttp.responseText;
         }
         else if (xmlhttp.status == 400) {
            alert('There was an error 400');
         }
         else {
            alert(xmlhttp.status);
         }
      }
   };

   xmlhttp.open("GET", url, true);
   xmlhttp.send();

}


function getJobsSummary(loc, success, error) {
   console.log("getJobsSummary called here");
   console.log("loc.lat:  " + loc.lat);
   console.log("loc.lon: " + loc.lng);

   var indeed_options = getIndeedOptions(cur_zip);

}



// clear glassdoor vars, indeed vars,
// and vars to calculate average company rating.
function clear_jobs_vars() {
   rating_sum = 0.0;
   total_matches_with_rating = 0;
   total_company_requests = 0;
   indeed_total_jobs = 0;
   indeed_jobs_json = null;
   indeed_jobs_array = null;
   avg_rating = null;
   total_company_requests = 0;
   total_companies_recieved = 0;
   industry_popularity = new Map();
}



function getIndeedOptions(zip) {
   return "?publisher=9876703242051712" +
      "&q=" + indeed_query +
      "&l=" + zip +
      "&sort=" +
      "&radius=" + job_radius_miles +
      "&st=" +
      "&jt=" + job_type +
      "&start=" +
      "&limit=" + limit +
      "&fromage=" +
      "&filter=" +
      "&latlong=1" + /* always return latlong */
      "&co=us" + /* always in USA */
      "&chnl=" +
      "&userip=1.2.3.4" + /* dummy IP */
      "&useragent=Mozilla/%2F4.0%28Firefox%29" +
      "&v=2"; /* always v2 */
}

//this function is used when zip code of location is null
function getJobsDefault() {
   return "<li>Full-time Jobs: ???</li><li>Avg Company: ???</li>";
}

/*

function getGlassdoorOptions(companyName) {
   return 't.p=114236&t.k=j1ERnurd9SI' +
      '&userip=0.0.0.0' +
      '&useragent=&format=json&v=1' +
      '&action=employers' +
      '&city=seattle&state=WA' +
      '&q=' + companyName;
} */


/* CORS-anywhere API request */
/*
function doCORSRequest(options, printResult) {
   var x = new XMLHttpRequest();
   x.open(options.method, cors_api_url + options.url);
   x.onerror = function() {
      console.log("An error occurred opening the request:");
   };
   try {
      x.onload = function() {
         return printResult(x.responseText);
      };
   }
   catch (err) {
      console.log("An error occurred loading the response");
   }

   if (/^POST/i.test(options.method)) {
      x.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
   }

   try {
      x.setRequestHeader('x-requested-with', 'XMLHTTPREQUEST');
      x.send(options.data);
   }
   catch (err) {
      console.log("An error occured sending the request");
      console.log(cors_api_url + options.url);
   }
}*/

/*
function getGlassdoorCompanies(indeed_tot_jobs, indeed_jobs_arr, callback) {

   for (var i = 0; i < indeed_jobs_arr.length; i++) {
      var jobTitle = indeed_jobs_arr[i].jobtitle[0]._text;
      var companyName = indeed_jobs_arr[i].company[0]._text;
      var glassdoorOptions = getGlassdoorOptions(companyName);
      console.log("http://api.glassdoor.com/api/api.htm?" + glassdoorOptions);

      doCORSRequest({
         method: 'GET',
         url: "http://api.glassdoor.com/api/api.htm?" + glassdoorOptions,
         data: ""
      }, function printResult(result) {
         if (result) {
            var JSONObject = JSON.parse(result);
            total_company_requests++;

            // only use exact matches
            var employersArray = JSONObject.response.employers;
            var bestMatchObj = employersArray[0];
            if (bestMatchObj && bestMatchObj.exactMatch == true) {
               glassdoor_companies.push(bestMatchObj);
               add_glassdoor_cache(glassdoor_companies);

               // Count industries, skipping missing/empty industries
               if (bestMatchObj.industry && bestMatchObj.industry !== "") {
                  if (industry_popularity.has(bestMatchObj.industry)) {
                     // Industry key exists
                     var count = industry_popularity.get(bestMatchObj.industry);
                     industry_popularity.set(bestMatchObj.industry, count + 1);
                  }
                  else {
                     // Industry key doesn't exist
                     industry_popularity.set(bestMatchObj.industry, 1);
                  }
               }

               var cur_rating = parseFloat(bestMatchObj.overallRating);
               // avoid unrated companies
               if (cur_rating !== 0) {
                  total_matches_with_rating++;
                  rating_sum += cur_rating;
               }
            }
            // invoking the callback when done with jobs requests
            if (total_company_requests == indeed_jobs_arr.length - 1) {
               jobs_in_area = indeed_tot_jobs;
               avg_company_rating = Number((rating_sum / total_matches_with_rating).toFixed(2));
               callback(jobs_in_area, avg_company_rating);
            }
         }
      });
   }
} */
