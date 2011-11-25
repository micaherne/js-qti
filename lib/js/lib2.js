(function($, window){
	
	$.widget("qti.bodyElement", {
		
		options: {
			ancestors: [],
			qtiElement: null
		},
		
		_create: function() {
			var self = this;
			self.element.addClass(self.namespace + '-' + self.widgetName);
			self._new();
			self._processChildren(self.options.qtiElement, self.element);
		},
		
		_new: function() {
			console.log('base');
		},
		
		_processChildren: function(qtiElement, pageElement) {
			var self = this;
			$(qtiElement).children().each(function(i, o) {
				if($.qti[o.nodeName]) {
					var ancestors = self.options.ancestors.slice(0);
					ancestors.push(self);
					var el = $('<span/>');
					el[o.nodeName]({ qtiElement: o, ancestors: ancestors});
					$(pageElement).append(el);
				} else {
					// TODO: Find a better way to make a shallow copy of an element
					var el = $(o).clone().children().remove();
					$(pageElement).append(el);
					self._processChildren(el, el);
				}
			});
		}
		
	});
	
	$.widget("qti.assessmentItem", {
		
		options: {
			qtiPath: null
		},
		
		_create: function() {
			console.log($['qti']['assessmentItem']);
			var self = this;
			$.ajax({
				dataType: 'xml',
				type: 'GET',
				url: self.options.qtiPath,
				success: function(data) { self._receiveQTI(data) }
			});
		},
		
		_receiveQTI: function(data) {
			var self = this;
			self.qtiElement = $('assessmentItem', data);
			$(self.element).html('');
			//self.element.append($('<h1>').text(self.qtiElement.attr('title')));
			$('itemBody', self.qtiElement).each(function(i, o) {
				self.element.append($('<div/>').itemBody({qtiElement: o, ancestors: [self]}));
			});
		},
		
		/* Given a URL relative to the XML file, expand it into an absolute one */
		_resolveRelativeUrl: function(url) {
			var self = this;
			var p = self.options.qtiPath;
			return p.substr(0, p.lastIndexOf('/')) + '/' + url;
		}
		
	});
	
	$.widget("qti.itemBody", $.qti.bodyElement, {
				
	});
	
	$.widget("qti.prompt", $.qti.bodyElement, {
		
		_new: function() {
			var self = this;
			$(self.element).text($(self.options.qtiElement).text());
		}
	
	});
	
	$.widget("qti.choiceInteraction", $.qti.bodyElement, {

		
	});
	
	$.widget("qti.simpleChoice", $.qti.bodyElement, {
		
		_new: function() {
			var self = this;
			var parent = self.options.ancestors[self.options.ancestors.length - 1]; // Don't use pop - changes array
			var maxChoices = $(parent.options.qtiElement).attr('maxChoices');
			var type = (maxChoices > 1) ? 'checkbox' : 'radio';
			
			var input = $('<input/>').attr('type', type).attr('name', 'simpleChoice').val($(self.options.qtiElement).attr('identifier'));
			$(self.element).append(input);
			var text = $('<span/>').text($(self.options.qtiElement).text())
			$(self.element).append(text);
			$(self.element).append('<br/>');
		}
		
	});
	
	
})(jQuery, window);

$(document).ready(function(){
	//$('div').assessmentItem({ qtiPath: 'http://localhost/js-qti/ref/qtiv2p1pd2/examples/items/choice.xml'});
	$('div').assessmentItem({ qtiPath: 'http://localhost/js-qti/ref/qtiv2p1pd2/examples/items/feedback.xml'});
});