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
			var self = this;
			self.processor.process();
			self.assignmentItem.showFeedback();
			console.log(self);
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
			
			// Add built-in variables
			self.addVariable({
				identifier: 'completionStatus',
				cardinality: 'single',
				baseType: 'identifier',
				value: ['not_attempted']
			});
			
			self.addVariable({
				identifier: 'duration',
				cardinality: 'single',
				baseType: 'duration',
				value: [0]
			});
			
			self.addVariable({
				identifier: 'numAttempts',
				cardinality: 'single',
				baseType: 'integer',
				value: [0]
			});
			
			self.startAttempt();
		},
		
		// A number of attempts are allowed in a single item session
		startAttempt: function() {
			var self = this;
			self.variables.numAttempts.value[0]++;
		},
		
		addVariable: function(variableDeclaration) {
			var self = this;
			var variable = $.extend(true, { value: null }, variableDeclaration);
			self.variables[variable.identifier] = variable;
			//TODO: set to default value
		},
		
		/* Set a variable to a given value. This is called by the interaction
		 * widgets. Value is always stored as an array, even for cardinality single.
		 */
		setVariable: function(identifier, value) {
			var self = this;
			if($.isArray(value)) {
				self.variables[identifier].value = value;
			} else {
				self.variables[identifier].value = [value];
			}
		},
		
		createProcessor: function(qtiElement) {
			var self = this;
			self.processor = {
				qtiElement: qtiElement,
				responseProcessing: self,
				children: [],
				process: function() {
					$.each(this.children, function(i, o) {
						o.process();
					});
				}
			};
			$(qtiElement).children().each(function(i, o) {
				self.processorAddChild(self.processor, o);
			});
		},
		
		processorAddChild: function(parent, qtiElement) {
			var self = this;
			var childProcessor = {
					qtiElement: qtiElement,
					responseProcessing: self,
					children: [],
					process: self.processFunctionFactory(qtiElement)
				};
			parent.children.push(childProcessor);
			$(qtiElement).children().each(function(i, o) {
				self.processorAddChild(childProcessor, o);
			});
		},
		
		compareVariables: function(var1, var2) {
			//TODO: This must check cardinality & baseType match
			if(var1.length != var2.length) return false;
			for(var i = 0; i < var1.length; i++) {
				if(var1[i] != var2[i]) return false;
			}
			return true;
		},
		
		// Creates a "process" function given the qtiElement
		processFunctionFactory: function(qtiElement) {
			
			switch(qtiElement.nodeName){
			case 'responseCondition':
				// Go through children until one returns true.
				return function() {
					$(this.children).each(function(i, o) {
						return !o.process();
					});
				};
				break;
			case 'responseIf':
				// If first child evaluates to true, process all others
				return function() {
					if(this.children[0].process()) {
						$(this.children.slice(1)).each(function(i, o) {
							o.process();
						});
						return true;
					}
				};
				break;
			case 'responseElseIf':
				// Identical to responseIf
				return function() {
					if(this.children[0].process()) {
						$(this.children.slice(1)).each(function(i, o) {
							o.process();
						});
						return true;
					}
				};
				break;
			case 'responseElse':
				// Process all children
				return function() {
					$(this.children).each(function(i, o) {
						o.process();
					});
				};
				break;
			case 'match':
				// Compare first child to second
				return function() {
					return this.responseProcessing.compareVariables(this.children[0], this.children[1]);
				};
				break;
/*		Untested operators.
 			case 'and':
				return function() {
					return this.children[0].process() && this.children[1].process();
				};
				break;
			case 'not':
				return function() {
					return !this.children[0].process();
				};
				break;
			case 'isNull':
				return function() {
					return this.children[0].process().value === null;
				};
				break;*/
			case 'setOutcomeValue':
				return function() {
					//TODO: Make this work properly
					//var variable = this.responseProcessing.variables[$(qtiElement).attr('identifier')];
					//variable.value = this.children[0].process().value;
					console.log("Setting " + $(qtiElement).attr('identifier') + " to  " + this.children[0].process().value);
					return this.responseProcessing.setVariable($(qtiElement).attr('identifier'), this.children[0].process().value);
				};
				break;
			case 'baseValue':
				return function() {
					return {
						baseType: $(qtiElement).attr('baseType'),
						value: [$(qtiElement).text()]
					};
				};
				break;
			case 'variable':
				return function() {
					return this.responseProcessing.variables[$(qtiElement).attr('identifier')];
				};
				break;
			default:
				return function() {
					console.log(qtiElement.nodeName + ' not implemented');
				};
			}
			
		}
	
	};
	
})(jQuery, window);