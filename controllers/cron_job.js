var App = require('../models/App');

//CRON JOB FUNCTION
exports.tasks = function() {
	var cutoff = new Date();
	
	var date = new Date();
	console.log('checking app ' + date);
	App.find({'imported': true}, function(err, apps) {
	  if (!err) {
	    console.log('Apps to process ' + apps.length);
	    for (i=0; i< apps.length; i++) {
			var app = apps[i];
			app.refresh();

			var timeDiff = Math.abs(date.getTime() - app.updatedAt.getTime());
			var diffDays = Math.floor(timeDiff / (1000 * 3600 * 24)); 
			// console.log("last update of " + app.name + " was " + diffDays);
			if (diffDays >= 1) {
				app.refreshAppData();
			}
			
	    }
	  }
	});
}