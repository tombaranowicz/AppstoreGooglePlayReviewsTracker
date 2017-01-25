var win = $(window);
var page = 0;
var inProgress = false;

$(document).ready(function() {

  // Place JavaScript code here...
	var csrf_token = $('meta[name="csrf-token"]').attr('content');
	$("body").bind("ajaxSend", function(elm, xhr, s){
		if (s.type == "POST") {
		  xhr.setRequestHeader('X-CSRF-Token', csrf_token);
		}
	});

	var pathname = window.location.pathname;
	// console.log('current path ' + pathname);

	if (pathname.indexOf('reviews', pathname.length - 'reviews'.length) !== -1) {
		
		//load first page on start
		var url = pathname + '/' + page;
		loadReviews(url);

		// Each time the user scrolls
		win.scroll(function() {
			// End of the document reached?
			if ($(document).height() - win.height() == win.scrollTop() && page != 0 && !inProgress) {
				var url = pathname + '/' + page;
				loadReviews(url);
			}
		});
	}

    $('input[type=radio][name=store]').change(function() {
        if (this.id == 'store_appstore') {
            $("#language_group").hide();
            $("#country_group").show();
        } else {
        	$("#country_group").hide();
        	$("#language_group").show();
        }
    });
});

function deleteApp(appId) {
	console.log('called delete with id ' + appId);

	var csrf_token = $('meta[name="csrf-token"]').attr('content');
    var person = {
        'app_id': appId,
        'x-csrf-token': csrf_token
    }

    $.ajax({
        url: '/delete_app',
        type: 'post',
        dataType: 'json',
        headers: {
        	'x-csrf-token': csrf_token
    	},
        success: function (data) {
        	console.log('got delete response ' + JSON.stringify(data));
        	window.location.href = window.location.protocol + "//" + window.location.host;
        },
        data: person
    });
}

function loadReviews(url) {
	inProgress = true;
	page++;

	var csrf_token = $('meta[name="csrf-token"]').attr('content');

	// console.log('call url ' + url);
	$.ajax({
        url: url,
        type: 'get',
        dataType: 'json',
        headers: {
        	'x-csrf-token': csrf_token
    	},
        success: function (data) {
        	inProgress = false;
        	var app = data.app;
        	if (data.reviews.length == 0) {
        		page = 0;
        	}
			for (i=0; i < data.reviews.length; i++) { 
				var review = data.reviews[i];

				var date1 = new Date(app.createdAt);
				var date2 = new Date(review.createdAt);
				var hoursOfDifference = Math.abs(date1 - date2) / 36e5;
				var minutesOfDifference = (Math.abs(date1 - date2) / (60*1000));
				
				// console.log('minutes of difference ' +  minutesOfDifference);
				// console.log('result ' + i + ' ' + JSON.stringify(review));

				var cell = document.createElement("div");
				cell.className = "panel panel-default"
				
				var innerCell = document.createElement("div");
				innerCell.className = "panel-body"
				cell.appendChild(innerCell);

				var titleRow = document.createElement("div");
				titleRow.className = "row";
				innerCell.appendChild(titleRow);

					var titleDiv = document.createElement("div");
					titleDiv.className = "col-md-12";
					titleRow.appendChild(titleDiv);

					var header = document.createElement("h4");
					titleDiv.appendChild(header);
					header.innerHTML = review.title;

						// var title = document.createElement("a");
						// title.innerHTML = review.title;
						// title.href = "/reviews/" + review._id;
						// title.target="_blank";
						// header.appendChild(title);

					// var linkDiv = document.createElement("div");
					// linkDiv.className = "col-md-2";
					// titleRow.appendChild(linkDiv);

					// 	var link = document.createElement("a");
					// 	link.innerHTML = "Public Link";
					// 	link.className = "pull-right";
					// 	link.href = "/reviews/" + review._id;
					// 	link.target="_blank";
					// 	linkDiv.appendChild(link);

				var comment = document.createElement("p");
				innerCell.appendChild(comment);

					var innerComment = document.createElement("small");
					innerComment.innerHTML = review.comment;
					comment.appendChild(innerComment);


				var byComment = document.createElement("p");
				innerCell.appendChild(byComment);
				if (app.store == "Google Play") {
					byComment.innerHTML = "by <a target=\"_blank\" href=\"https://www.google.pl/search?q=%22" + review.author + "%22+twitter+OR+facebook+OR+linkedin+OR+apple+OR+email\">" + review.author + "</a>";
				} else if (app.store == "AppStore") {
					byComment.innerHTML = "by <a target=\"_blank\" href=\"https://www.google.pl/search?q=%22" + review.author + "%22+twitter+OR+facebook+OR+linkedin+OR+apple+OR+email\">" + review.author + "</a> for version " + review.version;
				}
				
				var row = document.createElement("div");
				row.className = "row";
				innerCell.appendChild(row);

				var div = document.createElement("div");
				div.className = "col-md-6";
				row.appendChild(div);

				var rate = document.createElement("p");
				div.appendChild(rate);

					if (app.store == "Google Play") {
						for (var j = 0; j < review.score; ++j) {
		                	var star = document.createElement("i");
		                	star.className = "fa fa-star";
							rate.appendChild(star);
		              	}
		              	for (var j = review.score; j < 5; ++j) {
		                	var star = document.createElement("i");
		                	star.className = "fa fa-star-o";
							rate.appendChild(star);
		              	}
					} else if (app.store == "AppStore") {
						for (var j = 0; j < review.rate; ++j) {
		                	var star = document.createElement("i");
		                	star.className = "fa fa-star";
							rate.appendChild(star);
		              	}
		              	for (var j = review.rate; j < 5; ++j) {
		                	var star = document.createElement("i");
		                	star.className = "fa fa-star-o";
							rate.appendChild(star);
		              	}
	              	}


				div = document.createElement("div");
				div.className = "col-md-6";
				row.appendChild(div);

					var dateField = document.createElement("p");
					dateField.className = "text-muted";
					div.appendChild(dateField);

					var innerDate = document.createElement("small");
					innerDate.className = "pull-right";
					dateField.appendChild(innerDate);

					//MAX TIME TO IMPORT REVIEWS IS 10 MINUTES
					if (minutesOfDifference > 10) {
						innerDate.innerHTML = dateFormat(date2, "d mmm yyyy, h:MM TT");
					} else if (app.store == "Google Play") {
						innerDate.innerHTML = dateFormat(new Date(review.date), "d mmm yyyy");
					}


				var linkRow = document.createElement("div");
				linkRow.className = "row";
				innerCell.appendChild(linkRow);

				var linkDiv = document.createElement("div");
				linkDiv.className = "col-md-12";
				if (app.store == "Google Play") {
					var responseDiv = document.createElement("div");
					responseDiv.className = "col-md-6";
					linkRow.appendChild(responseDiv);

						var responseLink = document.createElement("a");
						responseLink.innerHTML = "Send Response";
						responseLink.href = review.url;
						responseLink.target="_blank";
						responseDiv.appendChild(responseLink);

					linkDiv.className = "col-md-6";
				}
				linkRow.appendChild(linkDiv);

						var link = document.createElement("a");
						link.innerHTML = "Public Link";
						link.className = "pull-right";
						link.href = "/reviews/" + review._id;
						link.target="_blank";
						linkDiv.appendChild(link);

				var element = document.getElementById("reviews_table");
				element.appendChild(cell);
			}
		}
	});
}

function searchPost(path, params, method) {

	if ($("#app_name").val().length==0) {
		$("#app_name_help").text('App Name cannot be empty');
	} else {
		$("#app_name_help").text('');
		// var decodedString = decodeURIComponent($csrf);
		var csrf_token = $('meta[name="csrf-token"]').attr('content');
	    var person = {
	        
	        'app_name':$("#app_name").val(),
	        'x-csrf-token': csrf_token
	    }

	    if($('#store_appstore').is(':checked')) {
			person.store = 'appstore';
			person.country = $("#country").val();
	    } else {
	    	person.store = 'google_play';
	    	person.language = $("#language").val();
	    }

	    console.log('params ' + JSON.stringify(person));

		var button = document.createElement("div");
		button.className = "row"
		
		var div = document.createElement("div");
		div.className = "col-md-2 col-md-offset-5"
		button.appendChild(div);

		var span = document.createElement("i");
		span.className = "fa fa-refresh fa-spin fa-3x fa-fw"
		div.appendChild(span);

		var element = document.getElementById("target");
		element.appendChild(button);

	    $.ajax({
	        url: '/add_app/search',
	        type: 'post',
	        dataType: 'json',
	        headers: {
	        	'x-csrf-token': csrf_token
	    	},
	        success: function (data) {
	        	console.log('got response ' + JSON.stringify(data));
	            // $('#target').html(JSON.stringify(data));

				$('#target').html('');
	            var results = data.results;
	            console.log('got response ' + results);

	            var text = "";
	            var i = 0;
				var len = results.length;
				for (; i < len; ) { 
					var app = results[i];
					console.log('result ' + JSON.stringify(app));

					var uberContainer = document.createElement("a");
					uberContainer.href = "/add_app/selected";
					uberContainer.value = app;
					uberContainer.onclick=function() {
						console.log(this.value);
						var store = 'google_play';
					    if($('#store_appstore').is(':checked')) {
							store = 'appstore';
					    }

						$.ajax({
							url: '/add_app',
							type: 'post',
							dataType: 'json',
							headers: {
								'x-csrf-token': csrf_token
							},
							success: function (data) {
								console.log('success ' + JSON.stringify(data));
								window.location.href = window.location.protocol + "//" + window.location.host;
							},
							error: function (xhr, ajaxOptions, thrownError) {
								alert(xhr.status + ": " + xhr.responseText);
							},
							data: {'app':this.value, 'country':$("#country").val(), 'language':$("#language").val(), 'store':store}
						});

						return false;
					}

					var container = document.createElement("div");
					container.className = "col-md-6"
					uberContainer.appendChild(container);

					var container2 = document.createElement("div");
					container2.className = "list-item"
					container.appendChild(container2);

					var row = document.createElement("div");
					row.className = "row"
					container2.appendChild(row);

					var imgDiv = document.createElement("div");
					imgDiv.className = "col-md-3"
					row.appendChild(imgDiv);				

					var image = document.createElement("img");
					image.className = "img-responsive"
					if(app.hasOwnProperty('artworkUrl100')){
						image.src = app.artworkUrl100;
					} else {
						image.src = app.icon;
					}
					imgDiv.appendChild(image);

					var titleDiv = document.createElement("div");
					titleDiv.className = "col-md-9"
					row.appendChild(titleDiv);				

					var title = document.createElement("h2");
					var string;
					if(app.hasOwnProperty('trackName')){
						string = app.trackName;
					} else {
						string = app.title;
					}
					if(string.length > 50) {
					    string = string.substring(0,49)+"...";
					}
					title.innerHTML = string;
					titleDiv.appendChild(title);

					var element = document.getElementById("target");
					element.appendChild(uberContainer);

				    i++;
				}
	        },
	        data: person
	    });
	}
}

<!--Start of Zopim Live Chat Script-->
window.$zopim||(function(d,s){var z=$zopim=function(c){z._.push(c)},$=z.s=
d.createElement(s),e=d.getElementsByTagName(s)[0];z.set=function(o){z.set.
_.push(o)};z._=[];z.set._=[];$.async=!0;$.setAttribute("charset","utf-8");
$.src="//v2.zopim.com/?46aOQSXN9uUz0OV7Fd6QHofoAIRLgmPw";z.t=+new Date;$.
type="text/javascript";e.parentNode.insertBefore($,e)})(document,"script");