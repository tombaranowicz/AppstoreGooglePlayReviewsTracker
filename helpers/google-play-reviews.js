'use strict';

const request = require('./request');
const memoize = require('./memoize');
const cheerio = require('cheerio');
const R = require('ramda');

// const c = require('./constants');

const sort = {
  NEWEST: 0,
  RATING: 1,
  HELPFULNESS: 2
};

function reviews (opts) {
  return new Promise(function (resolve, reject) {
    validate(opts);

    const options = {
      method: 'POST',
      uri: 'https://play.google.com/store/getreviews',
      form: {
        pageNum: opts.page || 0,
        id: opts.appId || opts.id,
        reviewSortOrder: opts.sort || sort.NEWEST,
        hl: opts.lang || 'en',
        reviewType: 0,
        xhr: 1
      },
      json: true
    };

    request(options, opts.throttle)
      .then(function (body) {
        const response = JSON.parse(body.slice(6));
        // console.log('raw reviews ' + response[0][2]);
        return response[0][2];
      })
      .then(cheerio.load)
      .then(parseFields)
      .then(resolve)
      .catch(reject);
  });
}

function parseFields ($) {
  const result = [];

  const reviewsContainer = $('div[class=single-review]');
  reviewsContainer.each(function (i) {
    const info = $(this).find('div[class=review-info]');
    const userName = $(this).find('span[class=author-name]').text().trim();

    const date = $(this).find('span[class=review-date]').text().trim();
    const score = parseInt(filterScore($(this).find('.star-rating-non-editable-container').attr('aria-label').trim()));
    const url = 'https://play.google.com' + info.find('.reviews-permalink').attr('href');

    const reviewContent = $(this).find('.review-body');
    // console.log('content ' + reviewContent + '\n\n');
    const title = reviewContent.find('span[class=review-title]').text().trim();
    const fullReviewLocalizedString = reviewContent.find('a').text().trim();
    const text = filterReviewText(reviewContent.text().trim(), title.length, fullReviewLocalizedString);
    // console.log('full review ' + fullReviewLocalizedString + '\n\n');

    const reviewId = $(this).find('div[class=review-header]').attr('data-reviewid').trim();
    // console.log('review id ' + reviewId);

    const developerComment = $(this).next('.developer-reply');
    let replyDate;
    let replyText;
    if (developerComment.length) {
      replyDate = developerComment.find('span.review-date').text().trim();
      replyText = developerComment.children().remove().end().text().trim();
    }

    const allInfo = {
      userName,
      date,
      url,
      score,
      title,
      text,
      replyDate,
      replyText,
      reviewId
    };

    result[i] = allInfo;
  });
  return result;
}

function validate (opts) {
  if (!opts || !opts.appId) {
    throw Error('appId missing');
  }

  if (opts.sort && !R.contains(opts.sort, R.values(sort))) {
    throw new Error('Invalid sort ' + opts.sort);
  }
  if (opts.page && opts.page < 0) {
    throw new Error('Page cannot be lower than 0');
  }
}

function filterReviewText (text, startIndex, regexText) {
  const regex = regexText;
  const result = text.substring(startIndex).replace(regex, '').trim();
  // console.log('review result ' + result + '\n\n');
  return result;
}

function filterScore (score) {
  // take the lower number, they're switched in japanese language
  const numbers = score.match(/([0-5])/g);
  return R.apply(Math.min, numbers);
}

module.exports = memoize(reviews);

module.exports.reviews = reviews;



