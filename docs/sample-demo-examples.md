# Fictional demo examples

105 new resort questions and 20 entirely fictional guests. These are not real bookings.

## Resort questions

1. Where can i wait before check-in?
2. Where can i leave my luggage?
3. Is there a welcome drink?
4. Can i use the lounge before my room is ready?
5. Where can i relax after checking out?
6. Where are the luggage carts?
7. Where is the orientation board?
8. Where can i get a welcome packet?
9. Where is the departure box?
10. Where is the taxi pickup point?
11. What is a garden king room?
12. What is a lagoon twin room?
13. What is in a family suite?
14. What is a cabana suite?
15. Do rooms have a mini fridge?
16. Is there a coffee maker in the room?
17. Can i get a kettle?
18. What furniture is on a balcony?
19. Can i cast to the room television?
20. How do i use the room safe?
21. What pillows can i request?
22. Can i request an extra blanket?
23. Is there an iron in the room?
24. Where is the guest laundry?
25. How much is the guest laundry?
26. How long does laundry take?
27. Where can i ask about dry cleaning?
28. Where can i clean my shoes?
29. Are reusable bottles provided?
30. Where are the water refill stations?
31. Does palm grill have vegetarian food?
32. Does palm grill have a kids menu?
33. What should i wear to palm grill?
34. Does palm grill take reservations?
35. Can i get takeaway from palm grill?
36. What coffee does blue heron cafe serve?
37. Does blue heron cafe have plant milk?
38. What pastries are at blue heron cafe?
39. What is served for breakfast at palmetto kitchen?
40. Can i get a picnic basket?
41. Where can i eat a picnic?
42. How do i ask about food ingredients?
43. Are high chairs available?
44. Can i bring a reusable cup?
45. Is room service available?
46. Where is the pool towel station?
47. Where can i check the pool depth?
48. Is a lifeguard guaranteed?
49. Can i use a large inflatable at the pool?
50. Can i bring glass to the pool?
51. Where are the pool cabanas?
52. Can you reserve a pool cabana?
53. Where are the pool lockers?
54. Where can i change for swimming?
55. What happens to swimming during a storm?
56. Where is serenity spa reception?
57. How early should i arrive for a spa appointment?
58. What massage is on the spa menu?
59. What facial is on the spa menu?
60. How do i change a spa appointment?
61. What equipment is in the gym?
62. Where is the fitness center?
63. Where is the yoga deck?
64. Can i borrow a yoga mat?
65. Where is water near the spa?
66. Where can i watch birds?
67. What shoes should i wear for nature walk?
68. How long is the nature walk route?
69. Are there benches along nature walk?
70. Can i take photos in the garden?
71. Where can i ask about bike rentals?
72. Where can i borrow board games?
73. Where is the reading area?
74. What can i do indoors on a rainy day?
75. Can the assistant sign me up for an activity?
76. Where is the craft table?
77. Where is the family lounge?
78. Can i request a baby cot?
79. Where can i store a stroller?
80. Where is the family restroom?
81. Can children visit activities alone?
82. When is the games room open?
83. What is in the games room?
84. Is there a teen lounge?
85. Is there a family movie tonight?
86. Where can i find an accessible route map?
87. Where is the lobby elevator?
88. Is there a step-free route to lagoon pool?
89. Is hearing assistance equipment available?
90. Can i get large print resort information?
91. Where are shaded rest areas?
92. Is there a quieter place to sit?
93. Is accessible transport available?
94. Where can i ask about assistance animal facilities?
95. Can dining staff help with accessible seating?
96. Where are the ev chargers?
97. Where can i park a bicycle?
98. Where do rideshare drivers meet guests?
99. Where can a coach drop off passengers?
100. How do i ask about lost property?
101. Where are the recycling bins?
102. Can i print a document?
103. Where can i take a work call?
104. Where is the souvenir shop?
105. Can i mail a postcard?

## Customer examples

Ask “What room is Alex Morgan in?”, then “When do they check out?” or “Is breakfast included?”

Ask “Show me GUEST-003” or “What are Taylor Chen’s preferences?”

| Demo ID | Fictional guest | Room | Stay |
|---|---|---|---|
| GUEST-001 | Alex Morgan | 201 | 2026-11-17 to 2026-11-20 |
| GUEST-002 | Jamie Rivera | 202 | 2026-11-18 to 2026-11-22 |
| GUEST-003 | Taylor Chen | 203 | 2026-11-19 to 2026-11-24 |
| GUEST-004 | Jordan Brooks | 204 | 2026-11-17 to 2026-11-23 |
| GUEST-005 | Casey Patel | 205 | 2026-11-18 to 2026-11-21 |
| GUEST-006 | Riley Thompson | 206 | 2026-11-19 to 2026-11-23 |
| GUEST-007 | Morgan Ellis | 207 | 2026-11-17 to 2026-11-22 |
| GUEST-008 | Avery Kim | 208 | 2026-11-18 to 2026-11-24 |
| GUEST-009 | Quinn Parker | 209 | 2026-11-19 to 2026-11-22 |
| GUEST-010 | Cameron Lee | 210 | 2026-11-17 to 2026-11-21 |
| GUEST-011 | Skyler Davis | 211 | 2026-11-18 to 2026-11-23 |
| GUEST-012 | Reese Wilson | 212 | 2026-11-19 to 2026-11-25 |
| GUEST-013 | Peyton Garcia | 213 | 2026-11-17 to 2026-11-20 |
| GUEST-014 | Rowan Bennett | 214 | 2026-11-18 to 2026-11-22 |
| GUEST-015 | Emerson Clark | 215 | 2026-11-19 to 2026-11-24 |
| GUEST-016 | Finley Adams | 216 | 2026-11-17 to 2026-11-23 |
| GUEST-017 | Harper Nguyen | 217 | 2026-11-18 to 2026-11-21 |
| GUEST-018 | Dakota Reed | 218 | 2026-11-19 to 2026-11-23 |
| GUEST-019 | Sage Miller | 219 | 2026-11-17 to 2026-11-22 |
| GUEST-020 | Blake Carter | 220 | 2026-11-18 to 2026-11-24 |

## Implementation and verification

- 144 searchable records total: 124 resort records and 20 fictional customer profiles.
- Source files: `knowledge/expanded.json` and `knowledge/sample-customers.json`.
- The generator `scripts/build-sample-content.py` reproduces 105 new Q&A records and the 20 profiles.
- Guest lookup is read-only and available only with local sample knowledge enabled. It does not access real reservation systems.
- Typed guest follow-ups retain the selected guest within the session. New conversations start without a selected guest.
- The live voice session receives the same fictional guest data; start a new call after a data update.
- Backend validation: 160 tests passed; every new example question retrieves its intended record.
- Browser: 144 records rendered; Alex Morgan search, room lookup, and departure follow-up passed.
- Live provider voice check: all three customer questions answered correctly (room 201, November 20 departure at 11 AM, breakfast included), with fictional labels and no browser errors. Evidence: `artifacts/customer-voice-report.json`.
