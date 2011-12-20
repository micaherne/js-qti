(function($, window){
	
	if(!window.QTI) window.QTI = {};
	
	var QTI = window.QTI;
	
	QTI.Expression = function() {
		if(this instanceof QTI.Expression()) {
			
		} else {
			return new QTI.Expression();
		}
	};
	QTI.Expression.prototype = $.extend({
		
		process: function() {
			
		}
		
	}, QTI.Type);
	
	QTI.ResponseRule = function() {
		if(this instanceof QTI.ResponseRule) {
			
		} else {
			return new QTI.ResponseRule();
		}
	};
	QTI.ResponseRule.prototype = $.extend({
		
		process: function() {
			
		}
	
	}, QTI.Type);
	/*
	 * params is object:
	 * 
	 *  - completionStatusHack - create completion_status as alias for real
	 *        completionStatus variable (as used in examples)
	 */
	QTI.ClientResponseProcessing = function(params) {
		if(this instanceof QTI.ClientResponseProcessing){
			if(params) {
				this.params = params;
			} else {
				this.params = {
					completionStatusHack: true
				};
			}
		} else {
			return new QTI.ClientResponseProcessing();
		}
	};
	QTI.ClientResponseProcessing.prototype = {
			
		variables: [],
		
		modalFeedback: [],
		
		process: function(data) {
			var self = this;
			return self.processor(data);
		},
		
		createProcessor: function(qtiElement) {
			var self = this;
			self.processor = self.createProcessFunction(qtiElement);
		},
		
		createProcessFunction: function(node){
			var self = this;
			var childFunctions = [];
			$(node).children().each(function(i, o) {
				childFunctions.push(self.createProcessFunction(o));
			});
			
			switch(node.nodeName) {
				/*
				 * From section 8: Response Processing
				 */
				case 'responseCondition':
					return function(data) {
					  $.each(childFunctions, function(i2, o2) {
		                  var result = o2(data);
		                  // Stop at first child that returns true
		                  if(result.value() === true){
		                	  return false; // break out of each loop
		                  }
		              });
					};
					break;
				case 'responseIf':
					return function(data) {
						var result = new QTI.Type().baseType('boolean')
							.value(childFunctions[0](data).value());
						if(result.value() === false) {
							return result;
						}
					    $.each(childFunctions.slice(1), function(i2, o2) {
		                    o2(data);
		                });
					    return result;
					};
					break;
				case 'responseElseIf': // identical to responseIf
					return function(data) {
						var result = new QTI.Type().baseType('boolean')
							.value(childFunctions[0](data).value());
						if(result.value() === false) {
							return result;
						}
					    $.each(childFunctions.slice(1), function(i2, o2) {
		                    o2(data);
		                });
					    return result;
					};
					break;
				case 'responseElse': // process all children
					return function(data) {
				        $.each(childFunctions, function(i2, o2) {
				            o2(data);
				        });
				        return new QTI.Type().baseType('boolean')
				        	.value(true);
				    };
				    break;
				case 'setOutcomeValue':
					return function(data) {
						var identifier = $(node).attr('identifier');
						var variable = data.getVariable(identifier);
						var value = childFunctions[0](data);
						// TODO: Check types are the same
						variable._value = value._value;
					};
					break;
				//case 'lookupOutcomeValue':
				//case 'exit':
				/*
				 * From section 15: Expressions
				 */
				case 'baseValue':
					return function(data) {
						return new QTI.Type().baseType($(node).attr('baseType'))
							.value($(node).text());
					};
					break;
				case 'variable':
					//TODO: Promotion of weighted outcomes
					return function(data) {
						return data.getVariable($(node).attr('identifier'));
					};
					break;
				case 'default':
					return function(data) {
						return data.getVariable($(node).attr('identifier')).getDefaultValue();
					};
					break;
				case 'correct':
					return function(data) {
						return data.getVariable($(node).attr('identifier')).getCorrectResponse();
					};
					break;
				//case 'mapResponse':
				//case 'mapReponsePoint':
				case 'null':
					return function(data) {
						return new QTI.Type();
					};
					break;
				case 'randomInteger':
					//TODO: Remove the temp variables
					return function(data) {
						var min = $(node).attr('min');
						var max = $(node).attr('max');
						var step = $(node).attr('step') || 1;
						var value = (Math.floor(Math.random() * ((max - min) / step)) * step) + min;
						return new QTI.Type().baseType('integer').value(value);
					};
					break;
				case 'randomFloat':
					return function(data) {
						var min = $(node).attr('min');
						var max = $(node).attr('max');
						return new QTI.Type().baseType('float')
							.value(Math.random() * (max - min) + min);
					};
					break;
				// TODO: 15.2 Expressions Used only in Outcomes Processing
				
				/*
				 * From section 15.3 Operators
				 */ 
				case 'multiple':
					return function(data) {
						var v = [];
						var result = null; // declared here so we get baseType and cardinality
						$.each(childFunctions, function(i2, o2) {
							result = o2(data);
				            $.extend(v, result._value);
				        });
						result._value = v;
						// TODO: We probably need to remove duplicates here
						return result;
					};
					break;
				case 'ordered':
					return function(data) {
						var v = [];
						var result = null; // declared here so we get baseType and cardinality
						$.each(childFunctions, function(i2, o2) {
							result = o2(data);
				            $.extend(v, result._value);
				        });
						result._value = v;
						return result;
					};
					break;
				case 'containerSize':
					return function(data) {
						// TODO: Should this be a QTI.Type? Looks not from the spec.
						return new QTI.Type().baseType('integer')
							.value(childFunctions[0](data)._value.length);
					};
					break;
				case 'isNull':
					return function(data) {
						return new QTI.Type().baseType('boolean')
							.value(childFunctions[0](data)._value.length == 0);
					};
					break;
				case 'index':
					return function(data) {
						var n = $(node).attr('n');
						var result = $.extend({ cardinality: 'single'}, childFunctions[0](data));
						if(result._value.length > n) {
							result._value = [result._value[n - 1]]; // 1, not zero, based
						} else {
							result._value = [];
						}
						return result;
					};
					break;
				//case 'fieldValue':
				case 'random':
					return function(data) {
						var result = $.extend({}, childFunctions[0](data));
						result.value(result._value[Math.floor(Math.random() * result._value.length)]);
						return result;
					};
					break;
				//case 'member':
				case 'delete':
					return function(data) {
						var what = childFunctions[0](data);
						if(what.value() === null) { 
							return what;
						} ;
						var result = $.extend({}, childFunctions[1](data));
						var resultvalue = [];
						$.each(result._value, function(i, o) {
							if(o == what.value()) return;
							resultvalue.push(o);
						});
						result._value = resultvalue;
						return result;
					};
					break;
				//case 'contains':
				//case 'substring':
				case 'not':
					return function(data) {
						return new QTI.Type().baseType('boolean')
							.value(childFunctions[0](data).value() == true);
					};
					break;
				case 'and':
					// TODO: Can we remove the temporary variables?
					return function(data) {
						 var result = new QTI.Type().baseType('boolean').value(true);
						 $.each(childFunctions, function(i, o) {
							 var childValue = o(data).value();
							 if(childValue === null || childValue === false) {
								 result.value(false);
								 return false; // break out of $.each
							 }
						 });
						 return result;
					};
					break;
				case 'or':
					return function(data) {
						 var result = new QTI.Type().baseType('boolean').value(false);
						 $.each(childFunctions, function(i, o) {
							 if(o(data).value() === true) {
								 result.value(true);
								 return false;
							 };
						 });
						 return result;
					};
					break;
				//case 'anyN':
				case 'match':
					return function(data) {
						return new QTI.Type().baseType('boolean')
							.value(childFunctions[0](data).equals(childFunctions[1](data)));
					};
					break;
				//case 'stringMatch':
				//case 'patternMatch':
				//case 'equal':
				//case 'equalRounded':
				//case 'inside':
				//case 'lt':
				//case 'gt':
				//case 'lte':
				//case 'gte':
				//case 'durationLT':
				//case 'durationGTE':
				//case 'sum':
				//case 'product':
				//case 'subtract':
				//case 'divide':
				//case 'power':
				//case 'integerDivide':
				//case 'integerModulus':
				//case 'truncate':
				//case 'round':
				//case 'integerToFloat':
				//case 'customOperator':
				default:
					 return function(data) {
				        var nodeName = node.nodeName;
				        console.log(nodeName + ' not implemented');
				        $.each(childFunctions, function(i2, o2) {
				            o2(data);
				        });
				    };
			}

		},
		
		compareVariables: function(var1, var2) {
			if(var1 == null || var2 == null) {
				return false;
			}
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
					return this.responseProcessing.compareVariables(this.children[0].process(), this.children[1].process());
				};
				break;
			case 'and':
				return function() {
					return this.children[0].process() && this.children[1].process();
				};
				break;
			case 'not':
				return function() {
					return !(this.children[0].process());
				};
				break;
			case 'isNull':
				return function() {
					return this.children[0].process().value === null;
				};
				break;
			case 'setOutcomeValue':
				return function() {
					//TODO: Make this work properly
					return this.responseProcessing.setVariable($(qtiElement).attr('identifier'), this.children[0].process());
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
					return this.responseProcessing.variables[$(qtiElement).attr('identifier')].getValue();
				};
				break;
			case 'correct':
				return function() {
					return this.responseProcessing.variables[$(qtiElement).attr('identifier')].getCorrectResponse();
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