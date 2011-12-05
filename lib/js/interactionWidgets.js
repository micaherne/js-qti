(function($, window){
	
	$.widget("qti.bodyElement", {
		
		options: {
			qtiElement: null
		},
		
		_create: function() {
			var self = this;
			if(self.options.qtiElement) {
				self.qtiElement = self.options.qtiElement;
				self._processElement(self.qtiElement, self.element);
			}
			
		},
		
		_processElement: function(qtiElement, pageElement) {
			var self = this;
			
			$(pageElement).addClass(self.namespace + '-' + qtiElement.nodeName.toLowerCase());
			
			$(qtiElement).contents().each(function(i, o) {
	
				if(o.nodeType === 1 && o.nodeName && $.qti[o.nodeName]) {
					var el = $('<span/>');
					el[o.nodeName]({ qtiElement: o});
					$(pageElement).append(el);
				} else {
					if(o.nodeType === 3) { //text
						var el = $(o).clone();
						$(pageElement).append(el);
					} else {
						var el = $('<' + o.nodeName + '>');
						$.each($(o).get(0).attributes, function(ind, n) {
							$(el).attr(n.nodeName, n.nodeValue);
						});
						$(pageElement).append(el);
						self._processChildren(o, el);
					}
					
				};
				
			});
		}
		
	});
	
	$.widget("qti.prompt", $.qti.bodyElement, {
		
		_processSelf: function() {
			var self = this;
			var el = $('<div/>');
			$(self.element).append(el);
			self._processChildren(self.options.qtiElement, el);
		}
	
	});

	$.widget("qti.choiceInteraction", {

		_create: function() {
			var self = this;
			
			if(self.options.qtiElement) {
				self.qtiElement = self.options.qtiElement;
				var attrs = $(self.qtiElement).get(0).attributes;
				$(attrs).each(function(i, o) {
					// toLower() because Firefox does this anyway without it
					self[o.nodeName.toLowerCase()] = o.nodeValue;
				});
				
				// Add prompt
				$('prompt', self.qtiElement).each(function(i, o) {
					var prompt = $('<div/>').prompt({qtiElement: o});
					$(self.element).append(prompt);
				});
				
				// Add simpleChoices
				$('simpleChoice', self.qtiElement).each(function(i, o) {
					var simpleChoice = $('<input/>').bodyElement({qtiElement: self.qtiElement}).attr({type: 'checkbox'});
					$(self.element).append(simpleChoice);
				});
			}
		}
	
	});
	
})(jQuery, window);