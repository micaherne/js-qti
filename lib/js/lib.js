(function($, window){
	
	$.widget("qti.assessmentItem", {
		
		options: {
			qtiPath: null
		},
		
		_create: function() {
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
			self.element.append($('<h1>').text(self.qtiElement.attr('title')));
			$('itemBody', self.qtiElement).each(function(i, o) {
				self.element.append($('<div/>').itemBody({qtiElement: o, assessmentItem: self}));
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
			self.element.addClass('qti.itemBody');
			
			/* First add itemBody contents as they are. All non-HTML elements
			 * will be tinkered with later on.
			 */
			$(self.options.qtiElement.children).each(function(i, o){
				self.element.append($(o).clone());
			});
			
			$('choiceInteraction', self.element).each(function(i, o) {
				var qtiElement = o;
				$(o).replaceWith($('<form/>').choiceInteraction({qtiElement: o, assessmentItem: self.options.assessmentItem}));
			});
			
			/* Change relative images to absolute */
			//TODO: This doesn't seem to work.
			$('img', self.element).each(function(i, o) {
				if($(this).attr('src') != undefined) {
					var absoluteUrl = self.options.assessmentItem._resolveRelativeUrl($(this).attr('src'));
					$(this).removeAttr('src').attr('src', absoluteUrl);
				}
			});
		}
		
	});
	
	$.widget("qti.choiceInteraction", {
		
		options: {
			qtiElement: null,
			assessmentItem: null
		},
		
		_create: function() {
			var self = this;
			self.element.addClass('qti.choiceInteraction');
			
			/* First add itemBody contents as they are. All non-HTML elements
			 * will be tinkered with later on.
			 */
			$(self.options.qtiElement.children).each(function(i, o){
				self.element.append($(o).clone());
			});
			
			$('prompt', self.element).each(function(i, o) {
				var html = $(o).text();
				$(o).replaceWith($('<p/>').html(html).addClass('qti.prompt'));
			});
			
			$('simpleChoice', self.element).each(function(i, o) {
				var type = 'radio';
				if(self.element.maxChoices > 1) {
					var type = 'checkbox';
				}
				var input = $('<input/>').attr('type', type).attr('name', 'simpleChoice').val($(o).attr('identifier'));
				$(o).replaceWith($('<span/>').addClass('qti.simpleChoice').text($(o).text()).prepend(input).append('<br/>'));
			});
		}
		
	});
	
	$.widget("qti.feedbackInline", {
		
		options: {
			qtiElement: null,
			assessmentItem: null
		},
		
		_create: function() {
			var self = this;
			self.element.addClass('qti.choiceInteraction');
		}
	});
	
})(jQuery, window);

$(document).ready(function(){
	//$('div').assessmentItem({ qtiPath: 'http://localhost/js-qti/ref/qtiv2p1pd2/examples/items/choice.xml'});
	$('div').assessmentItem({ qtiPath: 'http://localhost/js-qti/ref/qtiv2p1pd2/examples/items/feedback.xml'});
});