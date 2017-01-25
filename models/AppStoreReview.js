var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var appStoreReviewSchema = new mongoose.Schema({
  appId: String,
  reviewId: Number,
  author: String,
  version: String,
  rate: String,
  title: String,
  comment: String,
  vote: String,
  country: String,
  app: {type : Schema.ObjectId, ref : 'App'},

}, { timestamps: true });

appStoreReviewSchema.methods = {

}

var AppStoreReview = mongoose.model('AppStoreReview', appStoreReviewSchema);
module.exports = AppStoreReview;
