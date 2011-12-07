(function($, window){
	
	if(!window.QTI) window.QTI = {};
	
	var QTI = window.QTI;
	
	QTI.ClientResponseProcessing = function() {
		if(this instanceof QTI.ClientResponseProcessing){
			// nothing needs to happen here
		} else {
			return new QTI.ClientResponseProcessing();
		}
	};
	QTI.ClientResponseProcessing.prototype = {
			
		assignmentItem: null,
		
		variables: [],
		
		process: function() {
			alert('QTI.ClientResponseProcessing.process');
		},
		
		startSession: function() {
			var self = this;
			var opts = self.assignmentItem.options;
			
			self.variables = [];
			
			$.each(opts.responseDeclaration, function(i, o) {
				self.addVariable(o);
			});
			$.each(opts.outcomeDeclaration, function(i, o) {
				self.addVariable(o);
			});
			console.log(self);
		},
		
		addVariable: function(variableDeclaration) {
			var self = this;
			var variable = $.extend(true, { value: null }, variableDeclaration);
			self.variables[variable.identifier] = variable;
			//TODO: set to default value
		},
		
		createProcessor: function(qtiElement) {
			var self = this;
			console.log(qtiElement);
		}
	
	};
	
})(jQuery, window);