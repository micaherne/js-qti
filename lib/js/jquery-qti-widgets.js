(function($, window){
	
	"use strict";
	
	if(!window.QTI) window.QTI = {};
	
	var QTI = window.QTI;
	
	/*
	 * Common objects.
	 * 
	 */
	/*
	 * QTI.Type is the basis of both variables and expressions
	 */
	QTI.Type = function() {
		if(this instanceof QTI.Type){
			
		} else {
			return new QTI.Type();
		}
	};
	QTI.Type.prototype = {
		_cardinality: 'single',
		_baseType: 'identifier',
		_value: [], // All values stored as arrays even if cardinality single,
	
		cardinality: function(cardinality) {
			if(arguments.length) {
				this._cardinality = cardinality;
				return this;
			} else {
				return this._cardinality;
			}
		},
		
		baseType: function(baseType) {
			if(arguments.length) {
				this._baseType = baseType;
				return this;
			} else {
				return this._baseType;
			}
		},
		
		value: function(value) {
			if(arguments.length) {
				if($.isArray(value)) {
					this._value = value.slice(); // copy the contents
				} else {
					this._value = [value];
				}
				return this;
			} else {
				if(this._value.length === 0) {
					return null;
				}
				if(this._cardinality === 'single') {
					return this._value[0];
				} else {
					return this._value;
				}
			}
			
		},
		
		// Compare one QTI.Type with another
		// TODO: Check if JavaScript == works for all baseTypes
		equals: function(other) {
			var self = this;
			
			if(self._cardinality !== other._cardinality
					|| self._baseType !== other._baseType) {
				return false;
			}
			if(self._cardinality === 'single') {
				return self._value[0] === other._value[0];
			} else if(self._cardinality === 'multiple') {
				
				var result = true;
				$.each(self._value, function(i, o) {
					if(result && (other._value.indexOf(o) == -1)) {
						result = false;
						return false;
					}
				});
				$.each(other._value, function(i, o) {
					if(result && (self._value.indexOf(o) == -1)) {
						result = false;
						return false;
					}
				});
				return result;
				
			} else if(self._cardinality === 'ordered') {
				
				if(self._value.length !== other._value.length) {
					return false;
				}
				var result = true;
				$.each(self._value, function(i, o) {
					if(result && (o != other._value[i])) {
						result = false;
						return false;
					}
				});
				return result;
			}
			return true;
		}
		
	};
	
	QTI.Variable = function(params) {
		if(this instanceof QTI.Variable){
			var self = this;
			if(arguments.length === 0) {
				var params = {};
			}
			if(params.nodeType) { // If we've been passed an XML node, it's a declaration
				self.qtiElement = params;
				self.variableType = self.qtiElement.nodeName.replace('Declaration', '');
				if($(self.qtiElement).attr('identifier')) {
					self.identifier = $(self.qtiElement).attr('identifier');
				}
				self._cardinality = $(self.qtiElement).attr('cardinality');
				self._baseType = $(self.qtiElement).attr('baseType');		
			} else {
				$.each(params, function(i, o) {
					self[i] = o;
				});
			}
		} else {
			return new QTI.Variable(params);
		}
	};
	QTI.Variable.prototype = $.extend({
		
		identifier: null,
		qtiElement: null, 
		
		containsValue: function(value) {
			var self = this;
			return ($.inArray(value, self._value) != -1);
		},
		
		getDefaultValue: function() {
			var self = this;
			var value = [];
			if(self.qtiElement) {
				$('defaultValue value', self.qtiElement).each(function(i, o) {
					value.push($(o).text());
				});
			} else if(self._value) { // If there's no QTI element but the declaration has a value, use it
				value = self._value;
			}
			return $.extend({}, self, { _value: value }); // Overwrite any existing value
		},
		
		getCorrectResponse: function() {
			var self = this;
			if(!self.qtiElement) return null;
			var value = [];
			$('correctResponse value', self.qtiElement).each(function(i, o) {
				value.push($(o).text());
			});
			return $.extend({}, self, { _value: value }); // Overwrite any existing value
		},
		
		// Equivalent to getDefaultValue but useful to have alias as both make sense in context
		newInstance: function() {
			var self = this;
			return self.getDefaultValue();
		}
		
	}, new QTI.Type());
	
	/* Dummy implementation of response processing. Should be replaced
	 * with a working implementation on creating the assessmentItem widget.
	 */
	QTI.NotImplementedResponseProcessing = function() {
		if(this instanceof QTI.NotImplementedResponseProcessing){
			
		} else {
			return new QTI.NotImplementedResponseProcessing();
		}
	};
	QTI.NotImplementedResponseProcessing.prototype = {
		process: function() {
			alert('Processing not implemented');
		},
		
		startSession: function() {
			//
		},
		
		addVariable: function() {
			//
		},
		
		createProcessor: function(qtiElement) {
			//
		}
	};
	
	/*
	 * Overall widget for an assessmentItem. 
	 * TODO: This currently serves as the QTI item engine,
	 * although it may be a good idea to refactor.
	 */
	$.widget("qti.assessmentItem", {
		
		options: {
			qtiPath: null,
			responseProcessing: new QTI.NotImplementedResponseProcessing(),
			responseDeclaration: {},
			outcomeDeclaration: {},
			completionStatusHack: true // Do we create completion_status as alias? (as in example XML)
		},
		
		_create: function() {
			var self = this;
			if(self.options.qtiPath) {
				self.loadQTI(self.options.qtiPath);
			}
			
			self.element.on('choiceinteractionclick', function(e) { return self.endAttempt(e); });
		},
		
		loadQTI: function(qtiPath) {
			var self = this;
			self.qtiPath = qtiPath;
			self.element.addClass('qti-assessmentItem');
			$.ajax({
				dataType: 'xml',
				type: 'GET',
				url: qtiPath,
				success: function(data) { self._receiveQTI(data); }
			});
		},
		
		startSession: function() {
			var self = this;
			var opts = self.options;
			
			// Reset variables and bind to responseProcessing
			self.variables = opts.responseProcessing.variables = [];
			
			/* TODO: Move this bit to the assessmentItem widget (which is currently functioning
			 * as the QTI item engine - refactor this out at some point).
			 * 
			 * The assessmentItem should be responsible for creating the variables at the start
			 * of the session and managing them. It should bind the interaction widgets to them
			 * before allowing them to be interacted with. It should also bind the processor to 
			 * the same variables at the point of creation (of the processor).
			 * 
			 * Most of the stuff below, up to and not including createProcessor should probably
			 * be part of the assessmentItem / engine as they're core to the running of the 
			 * widgets and not response processing specific.
			 */
			$.each(opts.responseDeclaration, function(i, o) {
				self.addVariable(o.newInstance());
			});
			$.each(opts.outcomeDeclaration, function(i, o) {
				self.addVariable(o.newInstance());
			});
			
			// Add built-in variables
			self.addVariable(new QTI.Variable({
				identifier: 'completionStatus'
			}).value('not_attempted'));
			
			if(opts.completionStatusHack) {
				self.variables['completion_status'] = self.variables['completionStatus'];
			}
			
			self.addVariable(new QTI.Variable({
				identifier: 'duration',
				baseType: 'duration'
			}).value(0));
			
			self.addVariable(new QTI.Variable({
				identifier: 'numAttempts',
				baseType: 'integer'
			}).value(0));
			
			self.startAttempt();
		},
		
		// A number of attempts are allowed in a single item session
		startAttempt: function() {
			var self = this;
			self.variables.numAttempts.value[0]++;
			self.modalFeedback = [];
			// Show feedback before interaction too! (see adaptive.xml)
			self.showFeedback(false);
		},
		
		endAttempt: function() {
			var self = this;
			
			// TODO: Set all variables bound to endAttemptInteractions to false
			self.options.responseProcessing.process(self);
			self.showFeedback();
		},
		
		addVariable: function(variableDeclaration) {
			var self = this;
			self.variables[variableDeclaration.identifier] = variableDeclaration.getDefaultValue();
		},
		
		getVariable: function(identifier) {
			var self = this;
			return self.variables[identifier];
		},
		
		/* Set a variable to a given value. This is called by the interaction
		 * widgets.
		 */
		setVariable: function(identifier, value) {
			var self = this;
			if(!self.variables[identifier]){
				console.log('Unknown variable', identifier);
			}
			$.extend(self.variables[identifier], value);
		},
				
		/* Go through all inline feedback items and show or hide
		 * them based on the variable values in responseProcessing.
		 * 
		 * @var modal - show modal feedback?
		 */
		showFeedback: function(modal) {
			var self = this;
			if(typeof(modal) === 'undefined') {
				modal = true;
			};
			
			$(':qti-feedbackInline, :qti-feedbackBlock', self.element).each(function(i, o) {
				$(o).hide(); // hide it first
				/* We need to work out which widget it is so we can get the
				 * QTI element.
				 * TODO: write a getQtiElement function (where?)
				 */
				var feedbackType = $(o).hasClass('qti-feedbackInline') ? 'feedbackInline' : 'feedbackBlock';
				
				var qtiElement = $(o)[feedbackType]('option', 'qtiElement');
				var variableName = $(qtiElement).attr('outcomeIdentifier');
				var identifier = $(qtiElement).attr('identifier');
				
				if(typeof(variableName) == 'undefined') {
					console.log('undefined var', o);
				}
				// Process as in http://wiki.cetis.ac.uk/AssessmentItem:Modal_Feedback
				var varsEqual = (self.variables[variableName].containsValue(identifier));
				var showHide = $(qtiElement).attr('showHide');
				if(showHide == 'show') {
					if(varsEqual) {
						$(o).show();
					} else {
						$(o).hide();
					}
				}
				if(showHide == 'hide') {
					if(varsEqual) {
						$(o).hide();
					} else {
						$(o).show();
					}
				}
			});
			
			if(!modal) {
				return;
			}
			
			// Show modal feedback
			$(':qti-modalFeedback', self.element).each(function(i, o) {
				$(o).hide(); // hide it first
				var qtiElement = $(o).modalFeedback('option', 'qtiElement');
				var variableName = $(qtiElement).attr('outcomeIdentifier');
				var identifier = $(qtiElement).attr('identifier');
				
				// Process as in http://wiki.cetis.ac.uk/AssessmentItem:Modal_Feedback
				var varsEqual = (self.variables[variableName].containsValue(identifier));
				var showHide = $(qtiElement).attr('showHide');
				if(showHide == 'show') {
					if(varsEqual) {
						$(o).clone().dialog({modal:true}); // must clone otherwise we can't show the feedback more than once
					} else {
						$(o).hide();
					}
				}
				if(showHide == 'hide') {
					if(varsEqual) {
						$(o).hide();
					} else {
						$(o).clone().dialog({modal:true});
					}
				}
			});
		},
		
		_receiveQTI: function(data) {
			var self = this;
			var opts = self.options;
			
			self._trigger('qtiloaded');
			self.qtiElement = $('assessmentItem', data);
			$('responseDeclaration', self.qtiElement).each(function(i, o) {
				var identifier = $(o).attr('identifier');
				opts.responseDeclaration[identifier] = new QTI.Variable({
					variableType: 'response',
					identifier: identifier,
					qtiElement: o
				}).cardinality($(o).attr('cardinality'))
				  .baseType($(o).attr('baseType'));
			});
			$('outcomeDeclaration', self.qtiElement).each(function(i, o) {
				var identifier = $(o).attr('identifier');
				opts.outcomeDeclaration[identifier] = new QTI.Variable({
					variableType: 'outcome',
					identifier: identifier,
					qtiElement: o
				}).cardinality($(o).attr('cardinality'))
				  .baseType($(o).attr('baseType'));
			});
			$('itemBody', self.qtiElement).each(function(i, o) {
				var itemBody = $('<div/>').itemBody({qtiElement: o, assessmentItem: self});
				self.element.append(itemBody);
			});
			$('responseProcessing', self.qtiElement).each(function(i, o) {
				opts.responseProcessing.createProcessor(o);
			});
			$('modalFeedback', self.qtiElement).each(function(i, o) {
				var modalFeedback = $('<div/>').addClass('qti-modalFeedback').modalFeedback({qtiElement: o, assessmentItem: self});
				self.element.append(modalFeedback);
			});
			
			// fix image paths
			//TODO: Should probably happen elsewhere
			$('img', self.element).each(function(i, o) {
				$(o).attr('src', self._resolveRelativeUrl($(o).attr('src')));
			});
			$('object', self.element).each(function(i, o) {
				$(o).attr('data', self._resolveRelativeUrl($(o).attr('data')));
			});
						
			self._trigger('qtiload');
		},
		
		_processChildren: function(qtiElement, htmlElement, context) {
			var self = this;
			$(qtiElement).contents().each(function(i, o){
				var el = null; 
				if(o.nodeType === 3){
					// If it's text, just add it
					if(o.nodeValue.search(/^\s*$/) > -1) return;
					el = $('<span/>');
					el.text(o.nodeValue);
				} else if($.qti[o.nodeName]) {
					//If there's a widget, instantiate it
					el = $('<div/>').addClass(('qti-' + o.nodeName));
					el[o.nodeName]({ qtiElement: o, assessmentItem: self, context: context});
					$(self.element).append(el);
				} else {
					// just copy it
					el = $('<' + o.nodeName + '/>');
					$(o.attributes).each(function(i2, o2){
						el.attr(o2.nodeName, o2.nodeValue);
					});
					self._processChildren(o, el, context);
				}
				$(htmlElement).append(el);
			});
		},
		
		/* Given a URL relative to the XML file, expand it into an absolute one */
		_resolveRelativeUrl: function(url) {
			var self = this;
			var p = self.options.qtiPath;
			return p.substr(0, p.lastIndexOf('/')) + '/' + url;
		}
		
	});
	
	$.widget("qti.itemBody", {
		
		options: {
			qtiElement: null,
			assessmentItem: null
		},
		
		_create: function() {
			var self = this;
			self.qtiElement = self.options.qtiElement;
			self.options.assessmentItem._processChildren(self.qtiElement, self.element, {});
		}
		
	});
	
	$.widget("qti.endAttemptInteraction", {
		
		options: {
			qtiElement: null,
			assessmentItem: null
		},
		
		_create: function() {
			var self = this;
			var responseIdentifier = $(self.options.qtiElement).attr('responseIdentifier');
			var title = $(self.options.qtiElement).attr('title');
			// Create a button which will set the variable to true 
			var button = $('<input type="button"/>').val(title).on('click', function(e){
				self.options.assessmentItem.setVariable(responseIdentifier, new QTI.Variable({baseType: 'boolean'}).value(true));
				self.options.assessmentItem.endAttempt();
			});
			self.element.append(button);
			self.options.assessmentItem._processChildren(self.options.qtiElement, self.element, {});
		}
		
	});
	
	$.widget("qti.choiceInteraction", {
		
		options: {
			qtiElement: null,
			assessmentItem: null,
			responseDeclaration: null
		},
		
		_create: function() {
			var self = this;
			var opts = self.options;
			// Get variable declaration from assessmentItem 
			// TODO: Should be common to all interactions
			self.responseIdentifier = $(self.options.qtiElement).attr('responseIdentifier');
			
			// See if it has been set manually first (probably for testing)
			if(opts.responseDeclaration) {
				opts.responseDeclaration.identifier = self.responseIdentifier;
			// otherwise try to get it from the item
			} else if(opts.assessmentItem) {
				opts.responseDeclaration = opts.assessmentItem.options.responseDeclaration[self.responseIdentifier];
			}
			
			var form = $('<form/>');
			$(self.element).append(form);
			var context = {
				type: 'radio'
			};
			
			if(opts.responseDeclaration.cardinality === 'multiple'){
				context.type = 'checkbox';
			}
			opts.assessmentItem._processChildren(opts.qtiElement, form, context);
			
			if($(opts.qtiElement).attr('shuffle') == 'true') {
				// Create an array of non-fixed simpleChoices
				var nonFixed = [];
				$('simpleChoice', opts.qtiElement).each(function(i, o) {
					if($(o).attr('fixed') !== 'true') {
							$('div.qti-simpleChoice:has(input[value=' + $(o).attr('identifier') + '])', self.element).each(function(i2, o2) {
							nonFixed.push(this);
						});
					}
				});
				// Insert a shim before each element to be shuffled
				$.each(nonFixed, function(i, o) {
					$(o).before('<span id="jquery-qti-shim' + i + '"/>');
				});
				
				// Shuffle them and replace the shims
				nonFixed = self._shuffle(nonFixed);
				for(var i = 0; i < nonFixed.length; i++) {
					$('span#jquery-qti-shim' + i, self.element).replaceWith(nonFixed[i]);
				};
			}
			
			
			
			var button = $('<input type="submit"/>');
			form.append(button);
			//TODO: Add max / min checking 
			$(button).on('click', function(e){
				e.preventDefault();
				var responseValue = self._response();
				self.options.assessmentItem.setVariable(self.responseIdentifier, responseValue);
				self._trigger('click', 0, { response: responseValue});
			});
		},
		
		_response: function() {
			var self = this;
			var result = [];
			if(self.options.responseDeclaration.baseType() === 'identifier') {
				$('input[name=simpleChoice]:checked', self.element).each(function(i, o){
					result.push($(o).val());
				});
			};
			return self.options.responseDeclaration.newInstance().value(result);
		},
		
		// Fisher-Yates shuffle (blagged from http://snippets.dzone.com/posts/show/849)
		_shuffle: function(o){ //v1.0
			for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
			return o;
		}
		
	});
	
	$.widget("qti.feedbackInline", {
		
		options: {
			qtiElement: null,
			assessmentItem: null
		},
		
		_create: function() {
			var self = this;
			var showHide = $(self.options.qtiElement).attr('showHide');
			if(showHide === 'show') {
				self.element.hide();
			}
			self.options.assessmentItem._processChildren(self.options.qtiElement, self.element, {});
		}
	});
	
	$.widget("qti.feedbackBlock", {
		
		options: {
			qtiElement: null,
			assessmentItem: null
		},
		
		_create: function() {
			var self = this;
			var showHide = $(self.options.qtiElement).attr('showHide');
			if(showHide === 'show') {
				self.element.hide();
			}
			self.options.assessmentItem._processChildren(self.options.qtiElement, self.element, {});
		}
	});
	
	$.widget("qti.simpleChoice", {
		
		options: {
			qtiElement: null,
			assessmentItem: null,
			context: { type: 'radio' }
		},
		
		_create: function() {
			var self = this;
			var input = $('<input/>').attr('type', self.options.context.type).attr('name', 'simpleChoice').val($(self.options.qtiElement).attr('identifier'));
			$(self.element).append(input);
			self.options.assessmentItem._processChildren(self.options.qtiElement, self.element, {});
		}		
		
	});
	
	$.widget("qti.modalFeedback", {
		
		options: {
			qtiElement: null,
			assessmentItem: null,
			context: {  }
		},
		
		_create: function() {
			var self = this;
			self.element.hide();
			self.options.assessmentItem._processChildren(self.options.qtiElement, self.element, {});
		}		
		
	});
	
})(jQuery, window);