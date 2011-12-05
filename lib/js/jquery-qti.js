(function($, window){
	
	if(!window.QTI) window.QTI = {};
	
	window.QTI.AssessmentItem = function() {
		if(this instanceof QTI.AssessmentItem){
			this.htmlElement = null;
		} else {
			return new QTI.AssessmentItem();
		}
	};
	window.QTI.AssessmentItem.prototype = {
		
		options: {
			qtiPath: null
		},
		
		loadQTI: function(qtiPath) {
			var self = this;
			self.qtiPath = qtiPath;
			self.htmlElement = $('<div/>').addClass('qti-assessmentItem');
			$.ajax({
				dataType: 'xml',
				type: 'GET',
				url: qtiPath,
				success: function(data) { self._receiveQTI(data); }
			});
		},
		
		_receiveQTI: function(data) {
			var self = this;
			self._trigger('qtiloaded');
			self.qtiElement = $('assessmentItem', data);
			$('itemBody', self.qtiElement).each(function(i, o) {
				self.htmlElement.itemBody({qtiElement: o, assessmentItem: self});
			});
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
		
	};
	
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
			
			// Get variable declaration from assessmentItem
			self.responseIdentifier = $(self.options.qtiElement).attr('responseIdentifier');
			
			// See if it has been set manually first (probably for testing)
			if(self.options.responseDeclaration) {
				self.responseDeclaration = self.options.responseDeclaration;
				self.responseDeclaration.identifier = self.responseIdentifier;
			// otherwise try to get it from the item
			} else if(self.assessmentItem && self.assessmentItem.responseDeclaration[responseIdentifier]) {
				self.responseDeclaration = self.assessmentItem.responseDeclaration[responseIdentifier];
			}
			var form = $('<form/>');
			$(self.element).append(form);
			var context = {
				type: 'radio'
			};
			if($(self.options.responseDeclaration.cardinality === 'multiple')){
				context.type = 'checkbox';
			}
			self.options.assessmentItem._processChildren(self.options.qtiElement, form, context);
			var button = $('<input type="submit"/>');
			form.append(button);
			$(button).on('click', function(e){
				e.preventDefault();
				self._trigger('click', 0, { response: self._response()});
			});
		},
		
		_response: function() {
			var self = this;
			result = [];
			if(self.options.responseDeclaration.baseType === 'identifier') {
				$('input[name=simpleChoice]:checked', self.element).each(function(i, o){
					result.push($(o).val());
				});
			}
			return result;
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