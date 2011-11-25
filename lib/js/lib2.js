(function($, window){
	
	$.widget("qti.bodyElement", {
		
		options: {
			ancestors: [],
			qtiElement: null
		},
		
		_create: function() {
			var self = this;
			self.element.addClass(self.namespace + '-' + self.widgetName);
			self._processSelf();
		},
		
		_item: function() {
			var self = this;
			return self.options.ancestors[0];
		},
		
		_processSelf: function() {
			var self = this;
			self._processChildren(self.options.qtiElement, self.element);
		},
		
		_processChildren: function(qtiElement, pageElement) {
			var self = this;
			$(qtiElement).contents().each(function(i, o) {
	
				if(o.nodeType === 1 && o.nodeName && $.qti[o.nodeName]) {
					var ancestors = self.options.ancestors.slice(0);
					ancestors.push(self);
					var el = $('<span/>');
					el[o.nodeName]({ qtiElement: o, ancestors: ancestors});
					$(pageElement).append(el);
				} else {
					if(o.nodeType === 3) { //text
						var el = $(o).clone();
						$(pageElement).append(el);
					} else {
						// TODO: Find a better way to make a shallow copy of an element
						// There's something weird going on here (namespaces?). The copied
						// QTI img nodes don't work as HTML. 
						//var el = $(o).clone().contents().remove();
						var el = $('<img/>').attr('src', 'images/sign.png');
						$(pageElement).append(el);
						self._processChildren(el, el);
					}
					
				};
				
			});
		}
		
	});
	
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
			//self.element.append($('<h1>').text(self.qtiElement.attr('title')));
			$('itemBody', self.qtiElement).each(function(i, o) {
				self.element.append($('<form/>').itemBody({qtiElement: o, ancestors: [self]}));
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
		
		_processSelf: function() {
			var self = this;
			self._processChildren(self.options.qtiElement, self.element);
			/* Change relative images to absolute */
			//TODO: This doesn't seem to work.
			$('img', self.element).each(function(i, o) {
				if($(o).attr('src') != undefined) {
					var absoluteUrl = self._item()._resolveRelativeUrl($(o).attr('src'));
					$(o).attr('src', absoluteUrl);
				}
			});
		}
	
	});
	
	$.widget("qti.prompt", $.qti.bodyElement, {
		
		_processSelf: function() {
			var self = this;
			var el = $('<h2/>');
			$(self.element).append(el);
			self._processChildren(self.options.qtiElement, el);
		}
	
	});
	
	$.widget("qti.choiceInteraction", $.qti.bodyElement, {

		_processSelf: function() {
			var self = this;
			self._processChildren(self.options.qtiElement, self.element);
			var saveButton = $('<input type="button" value="Save"/>')
				.on('click', function(e){
					console.log(self._item());
				});
			self.element.append(saveButton);
		}
	
	});
	
	$.widget("qti.simpleChoice", $.qti.bodyElement, {
		
		_processSelf: function() {
			var self = this;
			var parent = self.options.ancestors[self.options.ancestors.length - 1]; // Don't use pop - changes array
			// TODO: This is not right - should be from cardinality of underlying variable
			var maxChoices = $(parent.options.qtiElement).attr('maxChoices');
			var type = (maxChoices > 1) ? 'checkbox' : 'radio';
			
			var input = $('<input/>').attr('type', type).attr('name', 'simpleChoice').val($(self.options.qtiElement).attr('identifier'));
			$(self.element).append(input);
			
			self._processChildren(self.options.qtiElement, self.element);
		}
		
	});
	
	$.widget("qti.feedbackInline", $.qti.bodyElement, {
		
	});
	
	
})(jQuery, window);

$(document).ready(function(){
	$('div').assessmentItem({ qtiPath: 'http://localhost/js-qti/ref/qtiv2p1pd2/examples/items/choice.xml'});
	//$('div').assessmentItem({ qtiPath: 'http://localhost/js-qti/ref/qtiv2p1pd2/examples/items/feedback.xml'});
});