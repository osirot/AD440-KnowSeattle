//Global vars
var pages = ["Home", "Walk-Score", "Hospitals", "Parks", "Culture", "Jobs", "Schools", "Art", "Crime", "Property", "Concerts", "Food"];
var currentPage = pages[0];
var showMap = true; //this is used to hide/show the toggle map option and hides the google map
var leftContentDiv = "left-content";

//basic breakpoint where map hides but nav remains ok
function mediaQuery() {
   var mq = window.matchMedia("(min-width: 1029px)");
   if (mq.matches) {
      return true;
   }
}

//secondary breakpoint where nav should be hidden/displayed differently to avoid overlap with title
function mediaQueryNav() {
   var mq = window.matchMedia("(max-width: 490px)");
   if (mq.matches) {
      return true;
   }
   else {
      return false;
   }
}

//Render functions
function render_nav() {
   var navbar = "";
   if (mediaQueryNav()) {
      navbar += '<div class="navbar-header" style="display:in-line;">' +
         '<button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#nav-collapse">' +
         '<span class="icon-bar"></span>' +
         '<span class="icon-bar"></span>' +
         '<span class="icon-bar"></span></button>' +
         '<a href="#" class="navbar-brand">Home</a></div>"' +
         '<div class="collapse navbar-collapse" id="nav-collapse">' +
         '<ul id="dropdown" class="nav navbar-nav">';
      // Avoid the home nav entry for mobile
      for (var i = 1; i < pages.length; i++) {
         navbar += "<li>" + linkify(pages[i]) + "</li>";
      }
   }
   else {
      navbar = '<div class="collapse navbar-collapse" id="nav-collapse">' +
         '<ul id="dropdown" class="nav navbar-nav">';
      // Include the home nav entry for desktop
      for (var i = 0; i < pages.length; i++) {
         navbar += "<li>" + linkify(pages[i]) + "</li>";
      }
   }
   // Hide toggle map button if map is not currently visible at this width
   if (mediaQuery()) {
      navbar += "<li class='right'><a href='javascript:void(0)' onclick='toggle_map()'>Toggle Map</a></li>";
   }
   navbar += '</ul></div>';
   document.getElementById("my-container").innerHTML = navbar;
}

function render_page(name) {
   var str;
   currentPage = name;

   //check if the heat map data is empty if not clear it before updating to new coords
   //clearHeatMap(heatmap); //-- not using the heatmap for now may come back to this

   //sets the css back to style sheet specs
   resetRightContent();

   //if the crime circle array is not empty, clear it before rendering new page/new location
   clearCircleMap(crimeCircleArray);

   switch (name) {
      case "Home":
         console.log("in the renders page home case loc: " + loc.lat + " " + loc.lng);
         render_tiles();
         return;
      case "Hospitals":
         str = getHospData(loc, true);
         break;
      case "Property":
         getPropertyData(loc,
            function(success) { update_div(leftContentDiv, success); },
            function(error) { update_div(leftContentDiv, error); });
         str = "Loading.....";
         return;
      case "Parks":
         getParks(loc,
            function(success) { update_div(leftContentDiv, success); },
            function(error) { update_div(leftContentDiv, error); });
         return;
      case "Culture":
         getCultureData(loc,
            function(success) { update_div(leftContentDiv, success); },
            function(error) { update_div(leftContentDiv, error); });
         return;
      case "Schools":
         getSchoolsData(loc,
            function(success) { update_div(leftContentDiv, success); },
            function(error) { update_div(leftContentDiv, error); });
         return;
      case "Walk-Score":
         getWalkScoreData(loc,
            function(success) { update_div(leftContentDiv, success); },
            function(error) { update_div(leftContentDiv, error); });
         return;
      case "Jobs":
         getJobsData(loc,
            function(success) { update_div(leftContentDiv, success); },
            function(error) { update_div(leftContentDiv, error); });
         str = "Loading.....";
         return;
      case "Concerts":
         getConcertData(loc,
            function(success) { update_div(leftContentDiv, success); },
            function(error) { update_div(leftContentDiv, error); },
            true);
         return;
      case "Art":
         getPublicArtData(loc,
            function(success) { update_div(leftContentDiv, success); },
            function(error) { update_div(leftContentDiv, error); },
            true);
         return;
      case "Crime":
         //update css only for this page to make google map larger and 
         //appear on top of table pages above will get reset back to original css 
         $("#right-content").css("width", "100%");
         $("#right-content").css("padding", "3%");

         //TODO: find where mobileSearch is and test for map in smaller screens 
         //$("#mobileSearch").css("float", "left");
         getCrimeDetailData(loc,
            function(success) { update_div(leftContentDiv, success); },
            function(error) { update_div(leftContentDiv, error); },
            true);
         return;
      case "Food":
         getFoodDetailData(loc,
            function(success) { update_div(leftContentDiv, success); },
            function(error) { update_div(leftContentDiv, error); });
         return;
      default:
         str = "Hey, now we're going to render " + name;
         break;
   }
   update_div(leftContentDiv, str);
}

function update_div(div, html) {
   document.getElementById(div).innerHTML = html;
}

function render_tiles() {
   var data = document.location.hash.substr(1);
   if (!!data && data != "Home") {
      render_page(data);
   }
   else {
      var tiles = '<div class="tile-container">';
      for (var i = 1; i < pages.length; i++) { //Start at 1 to skip 'Home' tile
         var tile = "",
            page = pages[i].replace(" ", "");
         tile += "<a href='#" + page + "'>";
         tile += "<div class='tile " + page + "'><span class='" + get_icon(pages[i]) + "'></span>";
         tile += get_summary(pages[i]);
         tile += "</div></a>";
         tiles += "<strong>" + tile + "</strong>";
      }
      tiles += "</div>";
      var tilesHeader = "<p id=\"tilesHeader\">Information About Your Area</p>";
      document.getElementById(leftContentDiv).innerHTML = tilesHeader + tiles;
   }
}

//Utility functions
function linkify(page) {
   page = page.replace(" ", "");
   return "<a href='#" + page +
      "' style='padding:10px;' id='ksnav'>" + page + "</a>";
}

function get_summary(page) {
   var sum = "&nbsp;" + page + "<br/><ul id=\"" + page + "_tile\">";
   switch (page) {
      case "Hospitals":
         sum += getHospSummary();
         break;
      case "Walk-Score":
         sum += "<li>Loading Walk-Score Data...</li>";
         getWalkScoreSummary(loc,
            function(success) { update_div("Walk-Score_tile", success); },
            function(error) { update_div("Walk-Score_tile", error); });
         break;
      case "Art":
         sum += "<li>Loading Art Data...</li>";
         getPublicArtSummary(loc,
            function(success) { update_div("Art_tile", success); },
            function(error) { update_div("Art_tile", error); });
         break;
      case "Culture":
         getCultureDataSummary(loc,
            function(success) { update_div("Culture_tile", success); },
            function(error) { update_div("Culture_tile", error); });
         break;
      case "Crime":
         sum += '<li>Loading Crime Data...</li>';
         getCrimeSummary(loc,
            function(success) { update_div("Crime_tile", success); },
            function(error) { update_div("Crime_tile", error); });
         break;
      case "Parks":
         sum += "<li>Loading Parks Data...</li>";
         getParksSummary(loc,
            function(success) { update_div("Parks_tile", success); },
            function(error) { update_div("Parks_tile", error); });
         break;
      case "Concerts":
         sum += "<li>Loading Concert Data...</li>";
         getConcertData(loc,
            function(success) { update_div("Concerts_tile", success); },
            function(error) { update_div("Concerts_tile", error); },
            false);
         break;
      case "Jobs":
         sum += "<li>Loading Jobs Data...</li>";
         getJobsSummary(loc,
            function(success) { update_div("Jobs_tile", success); },
            function(error) { update_div("Jobs_tile", error); });
         break;
      case "Property":
         sum += '<li>Loading Data...</li>';
         getPropertySummary(loc,
            function(success) { update_div("Property_tile", success); },
            function(error) { update_div("Property_tile", error); });
         break;
      case "Food":
         sum += '<li>Loading Data...</li>';
         getFoodSummary(loc,
            function(success) { update_div("Food_tile", success); },
            function(error) { update_div("Food_tile", error); });
         break;
      case "Schools":
         sum += '<li>Loading Data...</li>';
         getSchoolsSummary(loc,
            function(success) { update_div("Schools_tile", success); },
            function(error) { update_div("Schools_tile", error); }, false);
         break;
      default:
         sum += "<li>Pertinent Point</li>" +
            "<li>Salient Stat</li>";
         break;
   }
   return sum + "</ul>";
}

function get_icon(page) {
   var icon = "fa ";
   switch (page) {
      case "Hospitals":
         icon += "fa-ambulance fa-2x";
         break;
      case "Crime":
         icon += "fa-balance-scale fa-2x";
         break;
      case "Food":
         icon += "fa-yelp fa-2x";
         break;
      case "Walk-Score":
         icon += "fa-map-o fa-2x";
         break;
      case "Parks":
         icon += "fa-tree fa-2x";
         break;
      case "Culture":
         icon += "fa-smile-o fa-2x";
         break;
      case "Property":
         icon += "fa-home fa-2x";
         break;
      case "Schools":
         icon += "fa-university fa-2x";
         break;
      case "Jobs":
         icon += "fa-money fa-2x";
         break;
      case "Concerts":
         icon += "fa-music fa-2x";
         break;
      case "Art":
         icon += "fa-picture-o fa-2x";
         break;
      default:
         icon += "fa-question-circle-o fa-5";
         break;
   }
   return icon;
}

function toggle_map() {
   showMap = !showMap;
   leftContentDiv = showMap ? "left-content" : "left-content-full";
   document.getElementById(showMap ? "hide_map" : "show_map").setAttribute("id", showMap ? "show_map" : "hide_map");
   document.getElementById(showMap ? "left-content-full" : "left-content").setAttribute("id", showMap ? "left-content" : "left-content-full");
   document.getElementById(showMap ? "right-content-full" : "right-content").setAttribute("id", showMap ? "right-content" : "right-content-full");
}

function setFocus(elem) {
   var previous = document.getElementById('nav_active');
   if (previous) {
      previous.id = "";
   }
   elem.id = 'nav_active';
   // clear markers from map on change
   deleteMarkers();
}

window.onhashchange = function() {
   var data = document.location.hash.substr(1);
   !!data ? render_page(data) : render_page(pages[0]);
};

//this function is used above in the switch statement
//it resets the right content div (which holds the map) to the original css styles in 
//the style sheet we are using this becuase crimes page over rides the 
//width of this div and we need to set it back to original css when clicking 
// on a other pages. 
var resetRightContent = function() {
   $("#right-content").css("width", "");
   $("#right-content").css("padding", "");
};
