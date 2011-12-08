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
			this.processor.process();
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
		},
		
		addVariable: function(variableDeclaration) {
			var self = this;
			var variable = $.extend(true, { value: null }, variableDeclaration);
			self.variables[variable.identifier] = variable;
			//TODO: set to default value
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
			console.log(self.processor);
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
			return var1 === var2;
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
			case 'setOutcomeValue':
				return function() {
					//TODO: Make this work properly
					var variable = this.responseProcessing.variables[$(qtiElement).attr('identifier')];
					console.log(this.children[0]);
					variable.value = this.children[0].process().value;
				};
				break;
			case 'baseValue':
				return function() {
					return {
						baseType: $(qtiElement).attr('baseType'),
						value: $(qtiElement).text()
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