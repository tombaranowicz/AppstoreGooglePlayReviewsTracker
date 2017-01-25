var App = require('../models/App');

/**
 * GET /
 * Home page.
 */
exports.index = function(req, res) {
	if (req.user) {
		App.find({'_id': {$in: req.user.applications}}, function(err, applications) {
			if (err) return res.render(500);
			
			res.render('dashboard', {
		    	title: 'Tracked Apps',
		    	applications: applications
		  	});
		});
	} else {
	  res.render('home', {
	    title: 'Home'
	  });
	}
};