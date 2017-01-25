/**
 * GET /
 * Home page.
 */

var App = require('../models/App');
var User = require('../models/User');
var AppStoreReview = require('../models/AppStoreReview');
var GooglePlayReview = require('../models/GooglePlayReview');
var itunesApiSearch = require('itunes-api-search');
var gplay = require('google-play-scraper');

// app.get('/add_app', passportConfig.isAuthenticated, userController.getAddApp);
exports.getAddApp = function(req, res) {
	if (req.user) {
		res.render('addapp', {
	    	title: 'Add app'
	  	});
	} 
};

// app.post('/delete_app', passportConfig.isAuthenticated, appController.postDeleteApp);
exports.postDeleteApp = function(req, res) {

 	console.log('post delete app ' + req.body.app_id)

	if (req.user) { //he can remove the app only if this app is assigned to him, he is removing it from his list, not at all!
		App.findOne({'_id': {$in: req.user.applications}, '_id':req.body.app_id}, function(err, app) {
			if (err || !app) return res.send(500);

			req.user.applications.pull(app);
			req.user.save(function(err) {
				if (err){ 
					console.log(err);
					return res.status(500).send('App cannot be deleted.'); 
				}
				app.removeAppFromUser(function(error){

				});
				res.send({'status':'ok'});
			});
		});
	} else {
		res.render('account/login', {
	    	title: 'Login'
	  	});
	}
};

// app.post('/add_app/search', userController.postAddAppSearch);
exports.postAddAppSearch = function(req, res) {

 	console.log('post add app ' + req.body.app_name + ' ' + req.body.country + ' ' + req.body.store + ' ' + JSON.stringify(req.body));

 	if (req.body.store == 'appstore') {
		itunesApiSearch.search(req.body.app_name,{
			entity: 'software',
			limit: 50, // max 200 
			country: req.body.country
		}, function (err, response) {
			if (err) {
				console.log(err);
				return;
			}
			// console.log(res);
			return res.send(response);
		});
 	} else {
		gplay.search({
		    term: req.body.app_name,
		    lang: req.body.language,
		    num: 50
		  }).then(function(result, error) {
		  	var response = [];
		  		for (var i = 0; i < result.length; i++) {
		  			response.push(result[i]);
		  		}	  	

		  		return res.send({'results' : response});	
			});
 	}
};

// app.post('/add_app', passportConfig.isAuthenticated, appController.postAddApp);
exports.postAddApp = function(req, res) {

	console.log('got add app request ' + JSON.stringify(req.body));

	if (!req.body.hasOwnProperty('app') || !req.body.hasOwnProperty('country')) {
		console.log('no app param adding new app');
		return res.status(500).send('App is missing');
	} 

	//TODO CHECK IF EXISTS APP ID AND COUNTRY, IF YES THEN JUST ASSIGN TO USER

	if (req.user) {
		console.log("found user " + req.user.email);

		//BETA LIMIT
		if (req.user.applications.length>5) {
			return res.status(500).send('Only 5 apps are allowed in beta :)');
		}

		if (req.body.store == "google_play") {
			App.findOne({'storeId': req.body.app.appId, 'language': req.body.language}, function(err, app) {
				if (app) {
					req.user.applications.push(app);
					req.user.save(function(err) {
						if (err){ 
							console.log(err);
							return res.status(500).send('App cannot be added. Please try again.'); 
						}
						return res.send({'app_id':app._id});
					});
				} else {
					var app = new App();
					app.name = req.body.app.title;
					app.storeId = req.body.app.appId;
					app.store = "Google Play"
					app.language = req.body.language
					app.imageUrl = 'http:'+req.body.app.icon;

					console.log('saving app ' + JSON.stringify(app));
					app.save(function(err) {
						if (err) {
							console.log(err);
							return res.status(500).send('App cannot be added. Please try again.');
						}

						req.user.applications.push(app);
						req.user.save(function(err) {
							if (err){ 
								console.log(err);
								return res.status(500).send('App cannot be added. Please try again.'); 
							}
							console.log('app saved normally');
							app.import()
							return res.send({'app_id':app._id});
						});
					});
				}
			});
		} else {
			App.findOne({'storeId': req.body.app.trackId, 'country': req.body.country}, function(err, app) {
				if (app) {
					req.user.applications.push(app);
					req.user.save(function(err) {
						if (err){ 
							console.log(err);
							return res.status(500).send('App cannot be added. Please try again.'); 
						}
						return res.send({'app_id':app._id});
					});
				} else {
					var app = new App();
					app.name = req.body.app.trackName;
					app.storeId = req.body.app.trackId;
					app.store = "AppStore"
					app.country = req.body.country
					app.sellerName = req.body.app.sellerName;
					app.additionalInfo = req.body.app;
					app.imageUrl = req.body.app.artworkUrl100;
					//AppStore specific probably
					app.version = req.body.app.version;
					app.averageUserRatingForCurrentVersion = req.body.app.averageUserRatingForCurrentVersion;
					app.userRatingCountForCurrentVersion = req.body.app.userRatingCountForCurrentVersion;
					app.averageUserRating = req.body.app.averageUserRating;
					app.userRatingCount = req.body.app.userRatingCount;
					app.artistId = req.body.app.artistId;
					app.artistName = req.body.app.artistName;
					app.bundleId = req.body.app.bundleId;

					console.log('saving app ' + JSON.stringify(app));
					app.save(function(err) {
						if (err) {
							console.log(err);
							return res.status(500).send('App cannot be added. Please try again.');
						}

						req.user.applications.push(app);
						req.user.save(function(err) {
							if (err){ 
								console.log(err);
								return res.status(500).send('App cannot be added. Please try again.'); 
							}

							app.import()
							return res.send({'app_id':app._id});
						});
					});
				}
			});
		}
	} else {
		console.log("no user");
		res.render('account/login', {
		    title: 'Login'
	  	});
	}
};

// app.get('/app/:appId/reviews', passportConfig.isAuthenticated, appController.getAppReviews);
exports.getAppReviews = function(req, res) {
	if (req.user) {
		console.log('search app ' + JSON.stringify(req.params));
		App.findOne({'_id': {$in: req.user.applications}, '_id':req.params.appId}, function(err, app) {
			if (err || !app) return res.render(500);

			res.render('app/app_reviews', {
		    	title: app.name,
		    	app: app,
		    	reviews: [] //reviews intentionally 
		  	});
		});
	} else {
		res.render('account/login', {
	    	title: 'Login'
	  	});
	}
};

// app.get('/app/:appId/reviews/:pageId/', passportConfig.isAuthenticated, appController.getAppReviewsPage);
exports.getAppReviewsPage = function(req, res) {
	if (req.user) {
		console.log('search app ' + JSON.stringify(req.params));
		App.findOne({'_id': {$in: req.user.applications}, '_id':req.params.appId}, function(err, app) {
			if (err || !app) return res.render(500);

			if (app.store == "Google Play") {
				GooglePlayReview.find({'app': app}).sort({date: -1 }).limit(20).skip(20*req.params.pageId).exec(function(err, reviews) {
					if (err) return res.render(500);
					// console.log('will send gPlay reviews ' + reviews);
					res.send({'reviews':reviews, 'app':app});
				});
			} else if (app.store == "AppStore") {
				AppStoreReview.find({'app': app}).sort({reviewId: -1 }).limit(20).skip(20*req.params.pageId).exec(function(err, reviews) {
					if (err) return res.render(500);
					res.send({'reviews':reviews, 'app':app});
				});	
			}
		});
	} else {
		res.render('account/login', {
	    	title: 'Login'
	  	});
	}
};

// app.get('/reviews/:reviewId/', passportConfig.isAuthenticated, appController.getAppReview);
exports.getAppReview = function(req, res) {
	console.log('search app ' + JSON.stringify(req.params));
	AppStoreReview.findOne({'_id':req.params.reviewId}, function(err, appReview) {
		if (err) return res.render(500);

		if (!appReview) {
			GooglePlayReview.findOne({'_id':req.params.reviewId}, function(err, appReview) {
				if (err || !appReview) return res.render(500);

				App.findOne({'_id':appReview.appId}, function(err, app) {
					if (err || !app) return res.render(500);
					res.render('app/google_play_review', {
				    	title: appReview.title,
				    	app: app,
				    	review: appReview
				  	});
				});
			});

		} else {
			App.findOne({'_id':appReview.appId}, function(err, app) {
				if (err || !app) return res.render(500);

				res.render('app/review', {
			    	title: appReview.title,
			    	app: app,
			    	review: appReview
			  	});
			});
		}
	});
};