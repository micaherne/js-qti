(function($, window){
	
	$.widget("qti.bodyElement", {
		
		_create: function(){
			var self = this;
			if(self.options.xml) {
				self.qtiElement = $(self.options.xml);
				console.log(self.qtiElement);
			}
			self._processChildren(self.qtiElement, self.element);
		},
		
		_processChildren: function(qtiElement, pageElement) {
			var self = this;
			$(qtiElement).children().each(function(i, o) {
				var fn = self['_process_' + o.nodeName.toLowerCase()];
				if(fn) {
					fn(o, pageElement);
				} else if($.qti[o.nodeName]) {
					var ancestors = self.options.ancestors.slice(0);
					ancestors.push(self);
					var el = $('<span/>');
					el[o.nodeName]({ qtiElement: o, ancestors: ancestors});
					$(pageElement).append(el);
				} else {
					// TODO: Find a better way to make a shallow copy of an element
					var el = $(o).clone().children().remove();
					$(pageElement).append(el);
					self._processChildren(o, el);
				}
			});
		}, 
		
		_process_prompt: function(node, pageElement) {
			var span = $(pageElement).append('<span/>').addClass('qti-prompt');
			//self._processChildren(node, span);
		}
		
	});

	$.widget("qti.choiceInteraction", $.qti.bodyElement, {
		
		options: {
			// We can pass the variable details on their own.
			baseType: 'identifier',
			cardinality: 'single'
		}

	});

})(jQuery, window);