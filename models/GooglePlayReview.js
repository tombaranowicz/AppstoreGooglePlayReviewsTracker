var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var googlePlayReviewSchema = new mongoose.Schema({
  appId: String,
  reviewId: String,
  author: String,
  score: Number,
  date: Date,
  url: String,
  title: String,
  comment: String,
  language: String,
  replyDate: Date,
  replyComment: String,
  app: {type : Schema.ObjectId, ref : 'App'},

}, { timestamps: true });

googlePlayReviewSchema.methods = {

}

var GooglePlayReview = mongoose.model('GooglePlayReview', googlePlayReviewSchema);
module.exports = GooglePlayReview;