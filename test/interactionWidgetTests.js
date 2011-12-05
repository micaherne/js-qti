module("choiceInteraction");

var n = '<choiceInteraction responseIdentifier="RESPONSE" shuffle="false" maxChoices="1">\
    <prompt>What does it say?</prompt>\
    <simpleChoice identifier="ChoiceA">You must stay with your luggage at all times.</simpleChoice>\
    <simpleChoice identifier="ChoiceB">Do not let someone else look after your luggage.</simpleChoice>\
    <simpleChoice identifier="ChoiceC">Remember your luggage when you leave.</simpleChoice>\
 </choiceInteraction>';

module("Choice Interaction Widget");

test("Basic creation from XML", function() {
	var testChoiceInteraction = $('<div/>').choiceInteraction({ qtiElement: $(n) });
    ok( true, typeof(testChoiceInteraction) === 'object' );
    ok( 'RESPONSE' === testChoiceInteraction.data('choiceInteraction').responseidentifier);
});

test("second test within module", function() {
  ok( true, "all pass" );
});

module("Module B");

test("some other test", function() {
});
