//var heatmap; //heatmap variable -- not using the heatmap for now may come back to this
var crimeCircleArray; //keeping this as global variable to access in render.js page to clear array before page load

function getCrimeDetailData(loc, success, error) {
    var loc_lat = loc.lat;
    var loc_long = loc.lng;
    var radiusMeters = loc.rad;

    //not using this heatmap at the moment -- using circle map instead may come back to this
    //this array holds google.maps.LatLng objects for each pair of lat/lon returned from seattle gov api call
    //var heatMapDataPoints = []; //not using the heatmap for now may come back to this

    //(helps with speed to have seperate array of crime data that is used when creating circles and populating the circle array)
    //this array holds the data of specific crimes in top 10 categories. (not all crimes are in array)
    var crimeDataArray = [];
    //this array holds google.map.circle objects start out with an empty array when crime page loads 
    crimeCircleArray = [];

    //find date 6 months ago from today
    var sixMonthsAgo = new Date(); //this gets todays date
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6); //this sets the date to 6 months ago

    //this is for the table of crime data
    //Figure out the last six months and get in range
    var date_marker = new Date(new Date().getFullYear(), new Date().getMonth(), 01);

    var start_range = '\'' + date_marker.getFullYear().toString() + '-' +
        ('0' + (date_marker.getMonth() + 1).toString()).slice(-2) + '-01T00:00:00\'';

    date_marker.setMonth(date_marker.getMonth() - 5);

    var end_range = '\'' + date_marker.getFullYear().toString() + '-' +
        ('0' + (date_marker.getMonth()).toString()).slice(-2) + '-01T00:00:00\'';

    //Preform Ajax and Update UI
    $.ajax({
        url: "https://data.seattle.gov/resource/y7pv-r3kh.json",
        type: "GET",
        data: {
            "$limit": 50000,
            "$where": 'within_circle(location,' + loc_lat + ',' + loc_long + ', ' + radiusMeters + ')' +
                ' and date_reported between ' + end_range + ' and ' + start_range
        }
    }).done(function(data) {
        //Build 6 month recap table headers
        var tableCols = ["Month/Year", "Incident Count", "Most common", "2nd Most Common", "3rd Most Common"];
        var tableString = '<table class="hor-minimalist-b">';
        for (var i = 0; i < tableCols.length; i++) {
            tableString += '<th>' + tableCols[i] + '</th>';
        }
        var grouped_data = [];

        var count = 0; //this is used to limit the crime circle array for now to 15 thousand to prevent CPU spike/site crash

        $.each(data, function(index, value) {

            //not using this heatmap at the moment -- using circle map instead may come back to this
            //add crime data points into the heat map array as LatLng objects
            //heatMapDataPoints.push(new google.maps.LatLng(value.latitude, value.longitude)); //not using the heatmap for now may come back to this

            //compare the date of crime reported to the date six months ago. 
            var sixMonths = (value.date_reported >= sixMonthsAgo.toISOString()); //we are calling .toISOString because time formats need to be the same

            //check if crime type should be included in the circle map 
            var included = includeCrimeType(value.summarized_offense_description);

            //if crime is within the last siz months, in the list of included crime types we want to display then add the
            //crime to the array with assigned color and center lat/lon location that crime occured. 
            if (sixMonths && included && count <= 15000) {
                var circleColor = assignColor(value.summarized_offense_description);
                crimeDataArray.push({
                    center: new google.maps.LatLng(value.latitude, value.longitude),
                    color: circleColor
                });
                count++;
            }

            var monthdate = new Date(value.date_reported.toString());
            monthdate.setTime(monthdate.getTime() + monthdate.getTimezoneOffset() * 60 * 1000);
            monthdate.setDate(1);
            monthdate.setHours(1);
            monthdate.setMinutes(1);
            monthdate.setSeconds(1);

            var selectedMonthGroup = null;

            var alreadyInList = false;
            grouped_data.forEach(function(element) {
                if (element.grouped_month.getTime() == monthdate.getTime()) {
                    alreadyInList = true;
                    element.total_report_count++;
                    selectedMonthGroup = element;
                    return;
                }
            }, this);
            if (!alreadyInList) {
                var nw = new Object()
                nw.grouped_month = monthdate;
                nw.total_report_count = 1;
                nw.types = [];
                grouped_data.push(nw);
                selectedMonthGroup = nw;
            }

            //Now we we will always have a selected Month group that is the right
            //element to add the type record to with a types attr.
            var alreadyInListType = false;
            selectedMonthGroup.types.forEach(function(element) {
                if (element.name == value.offense_type) {
                    alreadyInListType = true;
                    element.count++;
                    return;
                }
            }, this);
            if (!alreadyInListType) {
                var nw = new Object()
                nw.name = value.offense_type;
                nw.count = 1;
                selectedMonthGroup.types.push(nw);
            }
        });

        /*
        //not using this at the moment -- using circle map instead may come back to this
        //this console.log is for testing to see what is in the heatMapData array of crime lat/lon points
        console.log("logging heatMapDataPoints below expecting to be full of crime points");
        console.log(heatMapDataPoints);
        createHeateMap(heatMapDataPoints);
        */

        //this should display the size of the circle array for the map 
        //console.log(crimeCircleArray); //use for testing
        //console.log(crimeDataArray); //use for testing

        // Create the crime circle map legend and display on the map 
        createMapLegend();

        //we are creating the circle map AFTER the $.each loop above to help speed up loading 
        //loop through the Crime array of crimes in "included" categories and create circles for each
        $.each(crimeDataArray, function(index, value) {
            createCircle(crimeCircleArray, value);
        });



        $.each(grouped_data, function(index, value) {
            var simplePropertyRetriever = function(obj) {
                return obj.count;
            };
            sort(simplePropertyRetriever, value.types);

            value.first_common_type = value.types[0].name + ' (' + value.types[0].count + ')';
            value.second_common_type = value.types[1].name + ' (' + value.types[1].count + ')';
            value.third_common_type = value.types[2].name + ' (' + value.types[2].count + ')';
        });
        // Tablefy for display
        grouped_data.reverse();
        $.each(grouped_data, function(index, value) {
            tableString += '<tr><td>' + crimeHtmlEncode(displayMonthYear(grouped_data[index].grouped_month)) +
                '</td><td>' + crimeHtmlEncode(grouped_data[index].total_report_count) + '</td><td>' +
                crimeHtmlEncode(grouped_data[index].first_common_type) + '</td><td>' +
                crimeHtmlEncode(grouped_data[index].second_common_type) + '</td><td>' +
                crimeHtmlEncode(grouped_data[index].third_common_type) + '</td></tr>';
        });
        //tableString += "</table><div id='chart_div'></div>";
        tableString += "</table><div id='map_div'></div>";

        /* //	google.charts.load is throwing an error and not loading. I am commenting out for now and not using this portion
        // Load the Visualization API and the corechart package.
        google.charts.load('current', { 'packages': ['corechart'] });
        google.charts.setOnLoadCallback(function() {
        	// Create the data table.
        	var data = new google.visualization.DataTable();
        	data.addColumn('string', 'Crime');
        	data.addColumn('number', 'Incidences');
        	for (var i = 0; i < 10; i++) {
        		data.addRow([grouped_data[0].types[i].name, grouped_data[0].types[i].count]);
        	}
        	// Set chart options
        	var options = {
        		'title': 'Most common crimes in ' + displayMonthYear(grouped_data[0].grouped_month),
        		'width': 800,
        		'height': 400
        	};
        	// Instantiate and draw our chart, passing in some options.
        	if ($("#chart_div").length == 0) {
        		$(".left-content").append("<div id='chart_div'></div>");
        	}
        	var chart = new google.visualization.PieChart(document.getElementById('chart_div'));
        	chart.draw(data, options);
        });
        */
        return success(tableString);

    }).fail(function(data) {
        var out = '<div>There was a problem getting the crime data in your area. </div>';
        error(out);
    });
}

function getCrimeSummary(loc, success, error) {
    var loc_lat = loc.lat;
    var loc_long = loc.lng;
    var radiusMeters = loc.rad;

    var date_marker = new Date(new Date().getFullYear(), new Date().getMonth(), 01);
    var start_range = '\'' + date_marker.getFullYear().toString() + '-' +
        ('0' + (date_marker.getMonth() + 1).toString()).slice(-2) + '-01T00:00:00\'';
    date_marker.setMonth(date_marker.getMonth() - 2);
    var end_range = '\'' + date_marker.getFullYear().toString() + '-' +
        ('0' + (date_marker.getMonth() + 1).toString()).slice(-2) + '-01T00:00:00\'';

    //Preform Ajax and Update UI
    $.ajax({
        url: "https://data.seattle.gov/resource/y7pv-r3kh.json",
        type: "GET",
        data: {
            "$limit": 50000,
            "$where": 'within_circle(location,' + loc_lat + ',' + loc_long + ', ' + radiusMeters + ')' +
                ' and date_reported between ' + end_range + ' and ' + start_range
        }
    }).done(function(data) {
        var grouped_data = [];
        $.each(data, function(index, value) {
            var monthdate = new Date(value.date_reported.toString());
            monthdate.setTime(monthdate.getTime() + monthdate.getTimezoneOffset() * 60 * 1000);
            monthdate.setDate(1);
            monthdate.setHours(1);
            monthdate.setMinutes(1);
            monthdate.setSeconds(1);

            var alreadyInList = false;
            grouped_data.forEach(function(element) {
                if (element.grouped_month.getTime() == monthdate.getTime()) {
                    alreadyInList = true;
                    element.total_report_count++;
                    return;
                }
            }, this);
            if (!alreadyInList) {
                var nw = new Object();
                nw.grouped_month = monthdate;
                nw.total_report_count = 1;
                grouped_data.push(nw);
            }
        });
        var month = new Array();
        month[0] = "Jan";
        month[1] = "Feb";
        month[2] = "Mar";
        month[3] = "Apr";
        month[4] = "May";
        month[5] = "June";
        month[6] = "July";
        month[7] = "Aug";
        month[8] = "Sep";
        month[9] = "Oct";
        month[10] = "Nov";
        month[11] = "Dec";
        var htmlToReturn = "<li>Incidents in " + month[grouped_data[1].grouped_month.getMonth()] + ": " +
            grouped_data[1].total_report_count + "</li>" +
            "<li>Incidents in " + month[grouped_data[0].grouped_month.getMonth()] + ": " +
            grouped_data[0].total_report_count + "</li>";
        return success(htmlToReturn);
    }).fail(function(data) {
        var out = '<div>There was a problem getting the crime data in your area. </div>';
        error(out);
    });
}

function crimeHtmlEncode(value) {
    //create a in-memory div, set it's inner text(which jQuery automatically encodes)
    //then grab the encoded contents back out.  The div never exists on the page.
    return $('<div />').text(value).html();
}

var sort = function(propertyRetriever, arr) {
    arr.sort(function(a, b) {
        var valueA = propertyRetriever(a);
        var valueB = propertyRetriever(b);

        if (valueA < valueB) {
            return 1;
        }
        else if (valueA > valueB) {
            return -1;
        }
        else {
            return 0;
        }
    });
};

var displayMonthYear = function(date) {
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", 'December'];
    return months[date.getMonth()] + " " + date.getFullYear();
};


//this function takes the crime description and assigns it a color (for the circle map) 
//each color is to display the category of crime each crime falls into. 
//I have assigned main 10 categories - within a main category there are sub crime types that the switch case statement checks
var assignColor = function(crimeType) {
    var color = "";
    switch (crimeType) {
        //homicide 
        case 'HOMICIDE':
            color = "#D81E05"; //red
            break;
            //robber/burglary
        case 'BURGLARY':
        case 'BURGLARY-SECURE PARKING-RES':
        case 'ROBBERY':
            color = "#990099"; //purple
            break;
            //assault/injury
        case 'ASSAULT':
        case 'INJURY':
            color = "#FF77A8 "; //pink
            break;
            //larceny-theft
        case 'MAIL THEFT':
        case 'PICKPOCKET':
        case 'PURSE SNATCH':
        case 'SHOPLIFTING':
        case 'BIKE THEFT':
            //color = "#9933ff"; //light purple
            color = "#b5b0ff";
            break;
            //vehicle theft
        case 'CAR PROWL':
        case 'VEHICLE THEFT':
            color = "#0000ff"; //blue
            break;
            //threats
        case 'THREATS':
            color = "#ffff00"; //yellow
            break;
            //WEAPON
        case 'WEAPON':
            color = "#ff9900"; // orange
            break;
            //PROSTITUTION
        case 'PROSTITUTION':
        case 'STAY OUT OF AREA OF PROSTITUTION':
            color = "#ff00f2"; //magenta
            break;
            //narcotics
        case 'NARCOTICS':
        case 'STAY OUT OF AREA OF DRUGS':
            color = "#00ffff"; //cyan
            break;
            //property
        case 'PROPERTY DAMAGE':
        case 'STOLEN PROPERTY':
            color = "#00ff00"; //green
            break;
        default: //default is set to white - should not land here if crime type was checked properly
            color = "#FFFFFF"; //white
    }
    return color;
};

//this function checks the crime type- of the boolean include returns true then it will be
//displayed on the crime circle map, otherwise we will not display it. We are trying to 
//limit the amount of crime being displayed on the map to help readability and speed - for now
// we are only displaying major crime categories identified. 
var includeCrimeType = function(crimeType) {
    var include; //boolean 

    switch (crimeType) {
        //the list of cases below are INCLUDE crime categories/types boolean should return true for all of these
        //homicide 
        case 'HOMICIDE':
            //robber/burglary
        case 'BURGLARY':
        case 'BURGLARY-SECURE PARKING-RES':
        case 'ROBBERY':
            //assault/injury
        case 'ASSAULT':
        case 'INJURY':
            //larceny-theft
        case 'MAIL THEFT':
        case 'PICKPOCKET':
        case 'PURSE SNATCH':
        case 'SHOPLIFTING':
            //vehicle theft
            //case 'BIKE THEFT':
        case 'CAR PROWL':
        case 'VEHICLE THEFT':
            //threats
        case 'THREATS':
            //WEAPON
        case 'WEAPON':
            //PROSTITUTION
        case 'PROSTITUTION':
        case 'STAY OUT OF AREA OF PROSTITUTION':
            //narcotics
        case 'NARCOTICS':
        case 'STAY OUT OF AREA OF DRUGS':
            //property
            //case 'OTHER PROPERTY':
        case 'PROPERTY DAMAGE':
        case 'STOLEN PROPERTY':
            include = true;
            break;
        default: //if the crime type gets to defult then it is in the DO NOT INCLUDE list and boolean is set to false
            include = false;
    }
    return include;
};

//this function creates a google map circle object for the circle map of crimes. 
//the arrayOfCircles holds all of the circles that are created and this should get cleared before rendering a new page
//the color parameter is the assigned color for the circle being created, and the dataObject is passed from the api call(grab lat/lon values) 
//var createCircle = function(arrayOfCirlces, color, dataObject) {
var createCircle = function(arrayOfCirlces, cimeDataObject) {
    // Add the circle for this crime to the map.
    var crimeCircle = new google.maps.Circle({
        //strokeColor: cimeDataObject.color,
        strokeColor: cimeDataObject.color, //outline in black
        strokeOpacity: 1,
        strokeWeight: 4,
        fillColor: cimeDataObject.color,
        fillOpacity: 1,
        map: gmap,
        center: cimeDataObject.center,
        radius: 10,
        draggable: false
    });
    arrayOfCirlces.push(crimeCircle); //this array should be cleared out in the render.js page before crime loads again
};

//not using this at the moment -- using circle map instead may come back to this
//set heatmap variable to a new heatmaplayer, set the heatlayer data to 
//the heatMapDataPoints(holds crime LatLng objects) and set the heatmap to the gmap
var createHeateMap = function(dataPoints) {
    heatmap = new google.maps.visualization.HeatmapLayer({
        data: dataPoints,
        gradient: [
            'rgba(255, 0, 0, 0)',
            'rgba(255, 255, 0, 0.9)',
            'rgba(0, 255, 0, 0.7)',
            'rgba(173, 255, 47, 0.5)',
            'rgba(152, 251, 152, 0)',
            'rgba(152, 251, 152, 0)',
            'rgba(0, 0, 238, 0.5)',
            'rgba(186, 85, 211, 0.7)',
            'rgba(255, 0, 255, 0.9)',
            'rgba(255, 0, 0, 1)'
        ],
        radius: 20
    });
    heatmap.setMap(gmap);
};


var createMapLegend = function() {
    // Create the circle map legend and display on the map
    var legend = document.createElement('div');
    legend.id = 'legend';
    var content = [];
    content.push('<h3>Crime Types</h3>');
    content.push('<p><div class="color red"></div>Homicide</p>');
    content.push('<p><div class="color pink"></div>Assault/Injury</p>');
    content.push('<p><div class="color orange"></div>Weapon</p>');
    content.push('<p><div class="color yellow"></div>Threats</p>');
    content.push('<p><div class="color green"></div>Property Damage/Stolen </p>');
    content.push('<p><div class="color cyan"></div>Narcotics</p>');
    content.push('<p><div class="color magenta"></div>Prostitution</p>');
    content.push('<p><div class="color lightpurple"></div>Larceny-Theft</p>');
    content.push('<p><div class="color blue"></div>Vehicle Theft/Car Prowl</p>');
    content.push('<p><div class="color purple"></div>Robbery/Burglary</p>');
    content.push('<p>*All data is within the past 6 months</p>');
    legend.innerHTML = content.join('');
    legend.index = 1;
    gmap.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(legend);
};
