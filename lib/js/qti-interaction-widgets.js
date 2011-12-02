(function($, window) {

$.widget("qti.choiceInteraction",  {

	options : {
		// We can pass the variable details on their own.
		baseType : 'identifier',
		cardinality : 'single'
	},
	
	_create: function() {
		var self = this;
		
		if(self.options.qtiElement) {
			self.qtiElement = self.options.qtiElement;
			self.responseIdentifier = $(self.options.qtiElement).attr('responseIdentifier'); 
		}
		
		self.element.addClass('qti-choiceInteraction');
		
		$('prompt', self.qtiElement).each(function(i, o) {
			var textContainer = $('<span/>').addClass('qti-prompt');
			$(o).contents().each(function(i2, o2) {
				textContainer.append($(o2).clone());
			});
			$(self.element).append(textContainer);
		});
				
		$('simpleChoice', self.qtiElement).each(function(i, o) {
			
			var container = $('<span/>').addClass('qti-simpleChoice');
			
			// Create the HTML control
			// TODO: Support (or at least check) other baseTypes than identifier
			var control = $('<input type="radio"/>').attr({ name: self.responseIdentifier, value: $(this).attr('identifier'), id: self.responseIdentifier + '.' + $(this).attr('identifier')});
			if(self.options.cardinality === 'multiple'){
				control = $('<input type="checkbox"/>').attr({ name: self.responseIdentifier, value: $(this).attr('identifier'), id: self.responseIdentifier + '.' + $(this).attr('identifier')});
			}
			
			// TODO: Does this work????
			$(control.on('click', function(e){
				self._trigger('interact');
			}));
			
			// Create the label
			var textContainer = $('<label/>').attr('for', control.attr('id'));
			$(o).contents().each(function(i2, o2) {
				textContainer.append($(o2).clone());
			});
			
			// Change feedbackInlines to spans
			$('feedbackInline', textContainer).each(function(i, o) {
				var feedbackInline = $('<span/>');
				$(o).contents().each(function(i2, o2) {
					feedbackInline.append(o2);
				});
				$(o).replaceWith(feedbackInline);
				if($(o).attr('showHide') == 'show') {
					feedbackInline.hide();
				}
			});
			
			// Add them to the widget element
			$(container).append(control).append(textContainer);
			$(self.element).append(container);

		});
	}

});

})(jQuery, window);