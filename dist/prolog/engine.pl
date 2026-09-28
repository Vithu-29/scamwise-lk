% ScamWise LK inference engine: ISO-style Prolog, Tau Prolog / SWI-Prolog.
% No assert/retract: every assessment has its own immutable input list.

contains(X, [X|_]).
contains(X, [_|Xs]) :- contains(X, Xs).
join([], X, X).
join([X|Xs], Ys, [X|Zs]) :- join(Xs, Ys, Zs).
reverse_list(Xs, Ys) :- reverse_acc(Xs, [], Ys).
reverse_acc([], Acc, Acc).
reverse_acc([X|Xs], Acc, Ys) :- reverse_acc(Xs, [X|Acc], Ys).

valid_value(yes).
valid_value(no).
valid_value(unknown).
validate_answers(Answers) :- validate_answers(Answers, []).
validate_answers([], _).
validate_answers([obs(Key, Value)|Xs], Seen) :-
    question(Key), valid_value(Value), \+ contains(Key, Seen),
    validate_answers(Xs, [Key|Seen]).

% Forward chaining: apply each eligible production once, reaching a fixed point.
% Multiple rules may support the same conclusion: retain every fired-rule trace.
forward(Answers, Facts, Trace) :-
    validate_answers(Answers),
    findall(P, domain_fact(_, P, _), Domain),
    join(Domain, Answers, Start),
    saturate(Start, [], [], Facts, ReverseTrace),
    reverse_list(ReverseTrace, Trace).

all_known([], _).
all_known([X|Xs], Facts) :- contains(X, Facts), all_known(Xs, Facts).
saturate(Facts, Fired, Trace, Final, FinalTrace) :-
    rule(Id, Conditions, Conclusion),
    \+ contains(Id, Fired), all_known(Conditions, Facts), !,
    (contains(Conclusion, Facts) -> NewFacts=Facts ; NewFacts=[Conclusion|Facts]),
    saturate(NewFacts, [Id|Fired], [step(Id, Conditions, Conclusion)|Trace], Final, FinalTrace).
saturate(Facts, _, Trace, Facts, Trace).

% Backward chaining: recursively prove a requested goal, with three-valued logic.
% Missing / unknown observations never count as explicit No.
backward(Goal, Answers, Status, Proof) :-
    allowed_goal(Goal), validate_answers(Answers),
    prove(Goal, Answers, [], Status, Proof).

prove(obs(Key, Expected), Answers, _, Status, Proof) :- !,
    ( contains(obs(Key, Actual), Answers) ->
      observation_result(Key, Expected, Actual, Status, Proof)
    ; Status=unknown, Proof=missing(obs(Key, Expected)) ).
prove(Goal, _, _, supported, knowledge(Id, Goal, Source)) :-
    domain_fact(Id, Goal, Source), !.
prove(Goal, _, Path, unknown, cycle(Goal)) :- contains(Goal, Path), !.
prove(Goal, Answers, Path, Status, Proof) :-
    findall(branch(Id, BranchStatus, Children),
      (rule(Id, Conditions, Goal),
       prove_all(Conditions, Answers, [Goal|Path], States, Children),
       and_status(States, BranchStatus)),
      Branches),
    choose_branch(Goal, Branches, Status, Proof).

observation_result(Key, Expected, unknown, unknown, missing(obs(Key, Expected))) :- !.
observation_result(Key, Expected, Expected, supported, input(obs(Key, Expected))) :- !.
observation_result(Key, Expected, Actual, not_supported, contradicted(obs(Key, Expected), obs(Key, Actual))).

prove_all([], _, _, [], []).
prove_all([Goal|Rest], Answers, Path, [Status|States], [Proof|Proofs]) :-
    prove(Goal, Answers, Path, Status, Proof),
    prove_all(Rest, Answers, Path, States, Proofs).
and_status(States, not_supported) :- contains(not_supported, States), !.
and_status(States, unknown) :- contains(unknown, States), !.
and_status(_, supported).
choose_branch(Goal, Branches, supported, because(Goal, Id, Children)) :-
    contains(branch(Id, supported, Children), Branches), !.
choose_branch(Goal, Branches, unknown, alternatives(Goal, Branches)) :-
    contains(branch(_, unknown, _), Branches), !.
choose_branch(Goal, Branches, not_supported, alternatives(Goal, Branches)).
