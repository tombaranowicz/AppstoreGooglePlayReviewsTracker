var mongoose = require('mongoose');
var AppStoreReview = require('../models/AppStoreReview');
var GooglePlayReview = require('../models/GooglePlayReview');
var User = require('../models/User');
var async = require('async')
let request = require('request');
var gplay = require('google-play-scraper');
var reviewsGooglePlay = require('../helpers/google-play-reviews')

var appSchema = new mongoose.Schema({
  name: String,
  storeId: String,
  store: String,
  sellerName: String,
  imageUrl: String,
  imported: Boolean,

  //AppStore specific probably
  country: String,
  version: String,
  averageUserRatingForCurrentVersion: Number,
  userRatingCountForCurrentVersion: Number,
  averageUserRating: Number,
  userRatingCount: Number,
  artistId: Number,
  artistName: String,
  bundleId: String,

  //Google Play specific
  language: String,
  minInstalls: Number,
  maxInstalls: Number,
  score: Number,
  reviews: Number,
  //version
  histogram_1: Number,
  histogram_2: Number,
  histogram_3: Number,
  histogram_4: Number,
  histogram_5: Number,


  additionalInfo: Object

}, { timestamps: true });

appSchema.methods = {

  import: function (cb) {

    var self = this
    console.log("start importing " + self.name);

    if (self.store == 'AppStore') {  

      var appStoreReviewsModule = require('../helpers/app-store-reviews');
      var appStoreReviews = new appStoreReviewsModule();

      appStoreReviews.on('review', function(review) {
        // console.log(review);

        var appReview = new AppStoreReview();
        appReview.appId = self.id;
        appReview.reviewId = review.id;
        appReview.author = review.author;
        appReview.version = review.version;
        appReview.rate = review.rate;
        appReview.title = review.title;
        appReview.comment = review.comment;
        appReview.country = review.country;
        appReview.app = self;

        appReview.save(function(err) {
          
        });
      });

      appStoreReviews.on('nextPage', function(nextPage) {
        console.log('get reviews ' + JSON.stringify(nextPage));
        appStoreReviews.getReviews(nextPage['appId'], nextPage['country'], nextPage['nextPage']);
      });

      appStoreReviews.on('lastPage', function(nextPage) {
        console.log('last page ' + JSON.stringify(nextPage));    
        self.imported = true;
        self.save(cb);
      });

      appStoreReviews.on('empty', function(data) {
        console.log('finished importing')
        self.imported = true;
        self.save(cb);
      });

      console.log('get reviews ' + self.storeId + " " + self.country);
      appStoreReviews.getReviews(self.storeId, self.country, 1);

    } else {
      self.refreshAppData();
      self.getGooglePlayReviews(0, true, [], cb);
    }
  },

  getGooglePlayReviews: function (page, firstRun, array, cb) {
    var self = this;
    var newReviewsToPush = [];

    reviewsGooglePlay.reviews({
      appId: self.storeId,
      page: page,
      lang: self.language
      // lang: self.country
    }).then(function(reviews){
      console.log('Retrieved ' + reviews.length + ' reviews! for ' + self.name + ' on page ' + page + ' first run ' + firstRun);
      // console.log(reviews);
      if (firstRun) { 
        if (reviews.length>0) {
          console.log('will ask for next run ' + (page+1));
          
          for (i=0; i< reviews.length; i++) {
            var review = reviews[i];
            array.push(review);
          }

          self.getGooglePlayReviews(page+1, firstRun, array, cb);
        } else {
          console.log('add ' + array.length + ' reviews');

          for (i=0; i< array.length; i++) {
            var review = array[i];
            
            var appReview = new GooglePlayReview();

            appReview.appId = self.id;
            appReview.reviewId = review.reviewId;
            appReview.author = review.userName;
            appReview.score = review.score;
            
            var moment = require("moment")
            moment.locale(self.language);

            try {
              appReview.date = moment(review.date, "DD MMM YYYY");
            }
            catch(err) {
              console.log('Google Play Review date format was wrong ' + review.date);
            }

            appReview.url = review.url;
            appReview.title = review.title;
            appReview.comment = review.text;
            appReview.language = self.language;
            appReview.app = self;

            appReview.save(function(err) {
              if (err) {
                console.log('Save Google Review error ' + err);
              }
            });
          }
        }
      } else {
        checkFunction(page, 0, reviews, array, cb);
      }
    }).catch(function(e){
      console.log('There was an error fetching the reviews! ' + e);
    });

    var notifyGooglePlayUsers = function(array) {
      async.eachSeries(array, function iterator(review, callback) {

        console.log('notify about ' + JSON.stringify(review));
        var appReview = new GooglePlayReview();
        appReview.appId = self.id;
        appReview.reviewId = review.reviewId;
        appReview.author = review.userName;
        appReview.score = review.score;
        appReview.date = Date.now();
        appReview.url = review.url;
        appReview.title = review.title;
        appReview.comment = review.text;
        appReview.language = self.language;
        appReview.app = self;

        appReview.save(function(err) {
          if (err) {
            console.log('Save2 Google Review error ' + err);
          }
          newReviewsToPush.push(appReview);
          callback();
        });

      }, function done() {
        User.find({'applications':self._id, 'unsubscribed': {$ne: true}}, function(err, users) {
          if (!err) {
            console.log('found users to notify ' + users.length);

            for (i=0; i< users.length; i++) {
              var user = users[i];
              user.notify(newReviewsToPush, self);
            }
          }
        });
      });
    }

    var checkFunction = function(page, nextId, reviews, array, cb) {
      if (nextId < reviews.length) {
        var review = reviews[nextId];
        GooglePlayReview.findOne({'reviewId': review.reviewId}, function(err, googlePlayReview) {
          if (err || googlePlayReview) {
            //notify with everything from array!
            
            if (array.length>0) {
              console.log('found ' + array.length + ' new reviews for ' + self.name);              
              notifyGooglePlayUsers(array);
            } else {
              console.log('no new reviews for ' + self.name);              
            }

            i=reviews.length;
          } else {
            console.log('new review ' + review.title + ' from ' + review.date);
            array.push(review);
            checkFunction(page, nextId+1, reviews, array, cb);
          }
        });
      } else {
        self.getGooglePlayReviews(page+1, false, array, cb);
      }
    }
  },

  refresh: function (cb) {

    var self = this

    console.log("refreshing reviews for: " + self.name);

    if (self.store == 'AppStore') {  
      var appStoreReviewsModule = require('../helpers/app-store-reviews');
      var appStoreReviews = new appStoreReviewsModule();
      var reviewsToCheck = [];
      var newReviews = [];
      var newReviewsToPush = [];

      appStoreReviews.on('review', function(review) {
        reviewsToCheck.push(review);
      });

      //TODO CHECK CASE IN WHICH ALL 500 reviews are new!

      var checkFunction = function(nextPage) {
        if (reviewsToCheck.length > 0) {
          var review = reviewsToCheck[0];
          reviewsToCheck.shift();
          AppStoreReview.findOne({'reviewId': review.id}, function(err, appStoreReview) {
            if (err || appStoreReview) {
              // console.log('already found review ' + review.title);
              // newReviews.push(review);
              if (newReviews.length>0) {
                notifyUsers();
              }
            } else {
              console.log('new review1 ' + review.title);
              newReviews.push(review);
              checkFunction(nextPage);
            }
          });
        } else {
          appStoreReviews.getReviews(nextPage['appId'], nextPage['country'], nextPage['nextPage']);
        }
      }

      var notifyUsers = function() {
        console.log('found ' + newReviews.length + ' reviews to notify');

        async.eachSeries(newReviews, function iterator(review, callback) {

          var appReview = new AppStoreReview();
          appReview.appId = self.id;
          appReview.reviewId = review.id;
          appReview.author = review.author;
          appReview.version = review.version;
          appReview.rate = review.rate;
          appReview.title = review.title;
          appReview.comment = review.comment;
          appReview.country = review.country;
          appReview.app = self;

          appReview.save(function(err) {
            newReviewsToPush.push(appReview);
            callback();
          });

        }, function done() {
          User.find({'applications':self._id, 'unsubscribed': {$ne: true}}, function(err, users) {
            if (!err) {
              console.log('found users to notify ' + users.length);

              for (i=0; i< users.length; i++) {
                var user = users[i];
                user.notify(newReviewsToPush, self);
              }
            }
          });
        });
      }

      appStoreReviews.on('nextPage', function(nextPage) {
        checkFunction(nextPage);
      });

      appStoreReviews.on('lastPage', function(nextPage) {
        console.log('last page ' + JSON.stringify(nextPage));    
      });

      appStoreReviews.on('empty', function(data) {
        console.log('finished importing')
      });

      console.log('get reviews for app ' + self.name + " " + self.country);
      appStoreReviews.getReviews(self.storeId, self.country, 1);
    } else {
      console.log('get google reviews for app ' + self.name + " " + self.language);
      self.getGooglePlayReviews(0, false, [], cb);
    }
  },

  refreshAppData: function (cb) {
    var self = this;
    console.log("will refresh app data for: " + self.name);

    if (self.store == 'AppStore') {  
      let url = null;

      if (self.bundleId != null) {
        url ='http://itunes.apple.com/lookup?bundleId=' + self.bundleId;
      } else {
        url ='http://itunes.apple.com/lookup?bundleId=' + self.additionalInfo.bundleId;
      }

      url = url + '&country=' + self.country;
      // console.log('refresh url ' + url);
       
      request(url, requestCallback);

      function requestCallback(err, header, res) {
        if (err) {
          console.log('error while refreshing the app ' + self.name);
          return;
        }

        try {
          var data = JSON.parse(res);
          var dictionary = data.results[0];
          // console.log('\nsuccess while refreshing the app ' + self.name + ' ' + JSON.stringify(dictionary));

            self.name = dictionary.trackName;
            self.sellerName = dictionary.sellerName;
            self.additionalInfo = dictionary;
            self.imageUrl = dictionary.artworkUrl100;
            //AppStore specific probably
            self.version = dictionary.version;
            self.averageUserRatingForCurrentVersion = dictionary.averageUserRatingForCurrentVersion;
            self.userRatingCountForCurrentVersion = dictionary.userRatingCountForCurrentVersion;
            self.averageUserRating = dictionary.averageUserRating;
            self.userRatingCount = dictionary.userRatingCount;
            self.artistId = dictionary.artistId;
            self.artistName = dictionary.artistName;
            self.save();

        } catch (e) {
          console.log('error while parsing refreshing the app ' + self.name + ' ' + e);
          return;
        }
      }
    } else {
      gplay.app({appId: self.storeId})
      .then(function(app){
        // console.log('Google Retrieved application: ' + JSON.stringify(app));

        // var data = JSON.parse(app);
        self.sellerName = app.developer;
        self.minInstalls = app.minInstalls;
        self.maxInstalls = app.maxInstalls;
        self.score = app.score;
        self.reviews = app.reviews;
        self.version = app.version;
        self.histogram_1 = app.histogram["1"];
        self.histogram_2 = app.histogram["2"];
        self.histogram_3 = app.histogram["3"];
        self.histogram_4 = app.histogram["4"];
        self.histogram_5 = app.histogram["5"];
        self.imported = true;
        self.save();

      })
      .catch(function(e){
        console.log('Google  There was an error fetching the application!');
      });
    }
  },

  removeAppFromUser: function(cb) {
    var self = this;
    User.find({'applications' : self}, function(err, users) {
      console.log('found users ' + users.length + ' for app ' + self.name);

      if (users.length == 0) {
        //remove the app
        console.log('no users found, removing app ' + self.name);
        
        //TODO remove all reviews related to this app
        if (self.store == 'AppStore') {  
          AppStoreReview.remove({'app': self}, function(err) {
            if (err) {
              console.log('gPlay reviews removed with error ' + err);
            } else {
              console.log('gPlay reviews removed without any problem');
            }

            self.remove(function (err) {
                  if (err){ 
                    console.log('remove app error ' + err);
                  } else{
                console.log('app removed without any problems');
                  }
                  cb();
              });
          });
        } else if (self.store == 'Google Play') {  
          GooglePlayReview.remove({'app': self}, function(err) {
            if (err) {
              console.log('gPlay reviews removed with error ' + err);
            } else {
              console.log('gPlay reviews removed without any problem');
            }

            self.remove(function (err) {
                  if (err){ 
                    console.log('remove app error ' + err);
                  } else{
                console.log('app removed without any problems');
                  }
                  cb();
              });
          });
        }
      } else {
        console.log('still some users are using the app ' + self.name);
        cb();
      }
    });
  }
}

var App = mongoose.model('App', appSchema);

module.exports = App;
