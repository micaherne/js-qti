(function($, window){
	
	"use strict";
	
	if(!window.QTI) window.QTI = {};
	
	var QTI = window.QTI;
	
	/*
	 * Common objects
	 */
	QTI.Variable = function(params) {
		if(this instanceof QTI.Variable){
			var self = this;
			$.each(params, function(i, o) {
				self[i] = o;
			});
		} else {
			return new QTI.Variable(params);
		}
	};
	QTI.Variable.prototype = {
		identifier: null,
		cardinality: 'single',
		baseType: 'identifier',
		value: [], // All values stored as arrays regardless of cardinality
		
		setValue: function(value) {
			if($.isArray(value)) {
				this.value = value.slice(); // copy the contents
			} else {
				this.value = [value];
			}
		}
	};
	
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
	
	$.widget("qti.assessmentItem", {
		
		options: {
			qtiPath: null,
			responseProcessing: new QTI.NotImplementedResponseProcessing(),
			responseDeclaration: {},
			outcomeDeclaration: {}
		},
		
		_create: function() {
			var self = this;
			if(self.options.qtiPath) {
				self.loadQTI(self.options.qtiPath);
			}
			
			self.element.on('choiceinteractionclick', function(e){ self.options.responseProcessing.process();});
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
			opts.responseProcessing.assignmentItem = self;
			opts.responseProcessing.startSession();
		},
		
		/* Go through all inline feedback items and show or hide
		 * them based on the variable values in responseProcessing.
		 * 
		 * TODO: Also show modal feedback if required.
		 */
		showFeedback: function() {
			var self = this;
			$(':qti-feedbackInline', self.element).each(function(i, o) {
				$(o).hide(); // hide it first
				var qtiElement = $(o).feedbackInline('option', 'qtiElement');
				var variableName = $(qtiElement).attr('outcomeIdentifier');
				var identifier = $(qtiElement).attr('identifier');
				if(self.options.responseProcessing.variables[variableName].value == identifier) {
					if($(qtiElement).attr('showHide') == 'show') {
						$(o).show();
					} else {
						$(o).hide();
					}
				}
			});
			
			//TODO: Show modal feedback
		},
		
		_receiveQTI: function(data) {
			var self = this;
			var opts = self.options;
			
			self._trigger('qtiloaded');
			self.qtiElement = $('assessmentItem', data);
			$('responseDeclaration', self.qtiElement).each(function(i, o) {
				var identifier = $(o).attr('identifier');
				opts.responseDeclaration[identifier] = {
					variableType: 'response',
					identifier: identifier,
					cardinality: $(o).attr('cardinality'),
					baseType: $(o).attr('baseType'),
					qtiElement: o
				};
			});
			$('outcomeDeclaration', self.qtiElement).each(function(i, o) {
				var identifier = $(o).attr('identifier');
				opts.outcomeDeclaration[identifier] = {
					variableType: 'outcome',
					identifier: identifier,
					cardinality: $(o).attr('cardinality'),
					baseType: $(o).attr('baseType'),
					qtiElement: o
				};
			});
			$('itemBody', self.qtiElement).each(function(i, o) {
				var itemBody = $('<div/>').itemBody({qtiElement: o, assessmentItem: self});
				self.element.append(itemBody);
			});
			$('responseProcessing', self.qtiElement).each(function(i, o) {
				opts.responseProcessing.createProcessor(o);
			});
			
			// fix image paths
			//TODO: Should probably happen elsewhere
			$('img', self.element).each(function(i, o) {
				$(o).attr('src', self._resolveRelativeUrl($(o).attr('src')));
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
				self.options.assessmentItem.options.responseProcessing.setVariable(self.responseIdentifier, responseValue);
				self._trigger('click', 0, { response: responseValue});
			});
		},
		
		_response: function() {
			var self = this;
			var result = [];
			if(self.options.responseDeclaration.baseType === 'identifier') {
				$('input[name=simpleChoice]:checked', self.element).each(function(i, o){
					result.push($(o).val());
				});
			}
			return result;
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
	

	
})(jQuery, window);