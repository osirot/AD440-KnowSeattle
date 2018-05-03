//var heatmap; //not using the heatmap for now may come back to this
var crimeCircleArray;

function getCrimeDetailData(loc, success, error) {
    var loc_lat = loc.lat;
    var loc_long = loc.lng;
    var radiusMeters = loc.rad;

    //this array holds google.maps.LatLng objects for each pair of lat/lon returned from seattle gov api call
    //var heatMapDataPoints = []; //not using the heatmap for now may come back to this

    //this array holds google.map.circle objects start out with an empty array when crime page loads
    crimeCircleArray = [];

    //find date twelve months ago from today
    var today = new Date();
    var previousYear = today.getFullYear() - 1;
    var sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    console.log("previousYear: " + previousYear);
    console.log("sixMonthsAgo: " + sixMonthsAgo);
    console.log("today: " + today);

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

        var count = 0; //this is used to limit the crime circle array for now to 10 thousand to prevent CPU spike

        $.each(data, function(index, value) {

            //add crime data points into the heat map array as LatLng objects
            //heatMapDataPoints.push(new google.maps.LatLng(value.latitude, value.longitude)); //not using the heatmap for now may come back to this

            //limit the array of crimes for now -- anything higher than 10 thousand will use a lot of computer CPU to run -- will come back to this
            //var TwelveMonths = (value.year >= previousYear);
            var sixMonths = (value.date_reported >= sixMonthsAgo.toISOString());
            //console.log(sixMonths);

            var included = includeCrimeType(value.summarized_offense_description);
            //console.log(included);

            if (sixMonths && included) {
                //console.log(value.date_reported);
                //console.log(TwelveMonths);



                var circleColor = assignColor(value.summarized_offense_description);
                //console.log(circleColor);//use for testing

                // Add the circle for this crime to the map.
                var crimeCircle = new google.maps.Circle({
                    strokeColor: circleColor,
                    strokeOpacity: 1,
                    strokeWeight: 4,
                    fillColor: circleColor,
                    fillOpacity: 0.2,
                    map: gmap,
                    center: new google.maps.LatLng(value.latitude, value.longitude),
                    radius: 5,
                    draggable: false
                });
                crimeCircleArray.push(crimeCircle); //this array will be cleared out in the render page before crime loads again

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

        /* //not using the heatmap for now may come back to this
        		//this console.log is for testing to see what is in the heatMapData array of crime lat/lon points
        		console.log("logging heatMapDataPoints below expecting to be full of crime points");
        		console.log(heatMapDataPoints);
        		
        		//set heatmap variable to a new heatmaplayer, set the heatlayer data to 
        		//the heatMapDataPoints(holds crime LatLng objects) and set the heatmap to the gmap
        		heatmap = new google.maps.visualization.HeatmapLayer({
        			data: heatMapDataPoints,
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
        		});*/

        //this should display  =the size of the circle array for the map 
        console.log(crimeCircleArray); //use for testing this should display 


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
//I have assigned main 16 categories - within a main category there are sub crime types that the switch case statement checks
var assignColor = function(crimeType) {
    var color = "";
    switch (crimeType) {
        //homicide 
        case 'HOMICIDE':
            color = "#FF0000";
            break;
            //robber/burglary
        case 'BURGLARY':
        case 'BURGLARY-SECURE PARKING-RES':
        case 'ROBBERY':
            color = "#C71585";
            break;
            //assault/injury
        case 'ASSAULT':
        case 'INJURY':
            color = "#FFB6C1";
            break;
            //larceny-theft
        case 'MAIL THEFT':
        case 'PICKPOCKET':
        case 'PURSE SNATCH':
        case 'SHOPLIFTING':
            color = "#5C5CFF";
            break;
            //vehicle theft
        case 'BIKE THEFT':
        case 'CAR PROWL':
        case 'VEHICLE THEFT':
            color = "#5CADFF";
            break;
            //threats
        case 'THREATS':
            color = "#ff8c00";
            break;
            //WEAPON
        case 'WEAPON':
            color = "#B0C4DE";
            break;
            //PROSTITUTION
        case 'PROSTITUTION':
        case 'STAY OUT OF AREA OF PROSTITUTION':
            color = "#FF5CFF";
            break;
            //narcotics
        case 'NARCOTICS':
        case 'STAY OUT OF AREA OF DRUGS':
            color = "#5CFFFF";
            break;
            //property
            //case 'LOST PROPERTY':
            // case 'OTHER PROPERTY':
        case 'PROPERTY DAMAGE':
            //case 'RECOVERED PROPERTY':
        case 'STOLEN PROPERTY':
            color = "#9ACD32";
            break;
        default: //default is set to white - should not land here if crime type was checked properly
            color = "#FFFFFF";
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
            //case 'LOST PROPERTY':
            //case 'OTHER PROPERTY':
        case 'PROPERTY DAMAGE':
            //case 'RECOVERED PROPERTY':
        case 'STOLEN PROPERTY':
            include = true;
            break;
        default: //if the crime type gets to defult then it is in the DO NOT INCLUDE list and boolean is set to false
            include = false;
    }
    return include;
};
