"""Rebuild explicitly fictional local-demo content; no real customer information."""
import json
from pathlib import Path
from datetime import date, timedelta
ROOT=Path(__file__).resolve().parents[1]
# Topic | example question | grounded sample answer
DATA='''Arrival lounge|Where can I wait before check-in?|The arrival lounge is located beside reception and opens daily from 6:00 AM to midnight.
Bag drop counter|Where can I leave my luggage?|The sample bag drop counter is located beside reception, open 6:00 AM to midnight; same-day storage is complimentary.
Welcome drinks|Is there a welcome drink?|The arrival lounge offers complimentary citrus water from 10:00 AM to 6:00 PM.
Early arrival lounge access|Can I use the lounge before my room is ready?|Registered sample guests may use the arrival lounge before their room is ready; room access still requires staff confirmation.
Departure lounge|Where can I relax after checking out?|The departure seating area is located beside reception; it is available until midnight.
Bell cart pickup|Where are the luggage carts?|Luggage carts are located at the main entrance; ask the bell desk for assistance.
Resort orientation|Where is the orientation board?|The orientation board is located opposite reception and displays the sample resort map.
Welcome packet|Where can I get a welcome packet?|Printed welcome packets are located at reception and include the sample map and activity calendar.
Express departure box|Where is the departure box?|The sample key return box is located on the reception counter; dropping a key does not confirm checkout or settle a bill.
Arrival taxi stand|Where is the taxi pickup point?|The taxi pickup point is located outside the main lobby beneath the blue canopy; staff must arrange any ride.
Garden King room|What is a Garden King room?|The fictional Garden King room has one king bed, a garden-facing balcony, a desk and a walk-in shower; maximum occupancy is two adults.
Lagoon Twin room|What is a Lagoon Twin room?|The fictional Lagoon Twin room has two twin beds, a lagoon-facing window and a desk; maximum occupancy is two guests.
Family Suite room|What is in a Family Suite?|The fictional Family Suite has one king bedroom, a living room with a sofa bed and a kitchenette; maximum occupancy is four guests.
Cabana Suite room|What is a Cabana Suite?|The fictional Cabana Suite has one king bed, a sitting area and a private patio; maximum occupancy is two adults.
Room mini fridge|Do rooms have a mini fridge?|All sample guest rooms include an empty mini fridge. No minibar purchases are available through the assistant.
Room coffee maker|Is there a coffee maker in the room?|All sample rooms include a capsule coffee maker and two complimentary capsules per day.
Room kettle|Can I get a kettle?|Electric kettles are listed as available on request from staff, subject to availability; the assistant cannot deliver one.
Balcony furniture|What furniture is on a balcony?|Garden King balconies contain two chairs and a small table in the fictional room specification.
Television casting|Can I cast to the room television?|Sample room televisions support casting through the on-screen pairing instructions; disconnect your device before departure.
Room safe instructions|How do I use the room safe?|Follow the instructions printed inside the sample room safe door; contact staff if it will not open. The assistant has no override codes.
Pillow options|What pillows can I request?|The sample pillow menu lists firm, soft and feather-free options, subject to staff availability.
Extra blankets|Can I request an extra blanket?|Extra blankets may be requested from staff; the assistant cannot submit or fulfill the request.
Ironing equipment|Is there an iron in the room?|Each sample guest room has an iron and folding ironing board in the wardrobe.
Guest laundry location|Where is the guest laundry?|The guest laundry is located on the second floor of the east wing, open from 8:00 AM to 8:00 PM.
Guest laundry prices|How much is the guest laundry?|The fictional laundry price is $4 per wash and $3 per drying cycle; detergent is included in the sample wash price.
Laundry turnaround|How long does laundry take?|A sample wash cycle takes about 35 minutes and a drying cycle about 45 minutes; actual machine availability is not tracked.
Dry cleaning collection|Where can I ask about dry cleaning?|The dry-cleaning inquiry point is located at the reception service counter; ask staff for options and a quote; no external service has been arranged.
Shoe cleaning station|Where can I clean my shoes?|A self-service shoe brush is located in the east-wing entrance vestibule.
Reusable water bottles|Are reusable bottles provided?|Two reusable bottles are provided in each fictional guest room and may be refilled at marked stations.
Refill station locations|Where are the water refill stations?|Refill stations are located beside reception, outside the fitness center and at the north garden gate.
Palm Grill vegetarian dishes|Does Palm Grill have vegetarian food?|The fictional Palm Grill menu lists a grilled vegetable bowl and a black bean burger; staff must confirm current ingredients.
Palm Grill children's menu|Does Palm Grill have a kids menu?|The sample children's menu lists pasta, grilled chicken and fruit cups; menu availability must be confirmed by staff.
Palm Grill dress code|What should I wear to Palm Grill?|Palm Grill's sample dress code is casual resort wear with shoes and a cover-up over swimwear.
Palm Grill reservations|Does Palm Grill take reservations?|Palm Grill accepts sample reservation inquiries through dining staff; the assistant cannot book or guarantee a table.
Palm Grill takeaway|Can I get takeaway from Palm Grill?|Takeaway is listed as available from Palm Grill during its published opening hours, subject to dining staff confirmation.
Blue Heron coffee choices|What coffee does Blue Heron Cafe serve?|The sample cafe menu includes espresso, americano, cappuccino, latte and decaf coffee.
Blue Heron plant milk|Does Blue Heron Cafe have plant milk?|The sample cafe menu lists oat and soy milk; staff must confirm stock and ingredient details.
Blue Heron bakery|What pastries are at Blue Heron Cafe?|The fictional bakery menu includes plain croissants, blueberry muffins and banana bread; items may sell out.
Palmetto breakfast options|What is served for breakfast at Palmetto Kitchen?|The sample breakfast buffet includes oatmeal, eggs, fruit, toast and yogurt; ask dining staff about ingredients.
Packed picnic baskets|Can I get a picnic basket?|A sample picnic basket inquiry can be made with Palm Grill staff by 5:00 PM the previous day; no order is placed by this chat.
Garden picnic area|Where can I eat a picnic?|The designated picnic tables are located in the north garden beside the walking trail entrance.
Dining allergy questions|How do I ask about food ingredients?|Speak directly with dining staff about ingredients and preparation. This demo cannot verify allergen safety or provide medical advice.
Dining high chairs|Are high chairs available?|High chairs are listed as available at Palmetto Kitchen and Palm Grill, subject to staff confirmation.
Dining reusable cups|Can I bring a reusable cup?|Blue Heron Cafe's sample policy allows clean reusable cups; ask the barista before ordering.
Dining room service|Is room service available?|Room service is not available at the fictional sample property; guests may ask Palm Grill about takeaway.
Pool towel station|Where is the pool towel station?|The pool towel station is located at the Lagoon Pool entrance and operates during that pool's published hours.
Pool depth markers|Where can I check the pool depth?|Depth markers are located around the pool edge; check the signs before entering and follow staff instructions.
Pool supervision|Is a lifeguard guaranteed?|This sample dataset does not confirm lifeguard coverage. Ask staff and follow posted safety rules; do not assume supervision.
Pool inflatables|Can I use a large inflatable at the pool?|Large inflatables require approval from pool staff under the fictional pool rules.
Pool glass policy|Can I bring glass to the pool?|Glass containers are prohibited in the fictional pool area; use shatter-resistant drinkware.
Pool cabana seating|Where are the pool cabanas?|The sample cabanas are located along the east side of Lagoon Pool; staff must confirm seating availability.
Cabana booking inquiries|Can you reserve a pool cabana?|The assistant cannot reserve a cabana; ask pool staff about fictional availability and pricing.
Pool lockers|Where are the pool lockers?|Day-use lockers are located beside the Lagoon Pool changing rooms; staff can explain their operation.
Pool changing rooms|Where can I change for swimming?|Pool changing rooms are located at the south entrance to Lagoon Pool.
Pool weather closure|What happens to swimming during a storm?|Staff may close outdoor pools during unsafe weather. Follow posted notices and staff instructions; this demo has no live weather feed.
Spa reception location|Where is Serenity Spa reception?|Serenity Spa reception is located in the west wing on the ground floor.
Spa arrival guidance|How early should I arrive for a spa appointment?|The fictional spa asks guests to arrive 15 minutes before their scheduled appointment.
Spa sample massage|What massage is on the spa menu?|The fictional Serenity Spa menu lists a 50-minute relaxation massage; ask spa staff about suitability, price and availability.
Spa sample facial|What facial is on the spa menu?|The fictional spa menu lists a 30-minute botanical facial; staff must confirm ingredients, suitability and price.
Spa cancellation inquiries|How do I change a spa appointment?|Contact Serenity Spa staff directly to review appointment terms; this assistant cannot modify an appointment.
Fitness equipment|What equipment is in the gym?|The sample fitness center contains treadmills, stationary bikes, dumbbells and yoga mats.
Fitness location|Where is the fitness center?|The fitness center is located on the ground floor of the east wing; its existing sample policy lists 24-hour guest access.
Yoga deck location|Where is the yoga deck?|The yoga deck is located behind Serenity Spa overlooking the west garden.
Yoga mat borrowing|Can I borrow a yoga mat?|Sample yoga mats can be requested at spa reception, subject to availability; this assistant cannot reserve equipment.
Wellness hydration station|Where is water near the spa?|A complimentary water station is located in the Serenity Spa reception lounge during spa opening hours.
Garden birdwatching|Where can I watch birds?|The fictional birdwatching viewpoint is located on the north garden trail; keep distance from wildlife and remain on marked paths.
Nature Walk footwear|What shoes should I wear for Nature Walk?|Comfortable closed-toe walking shoes are recommended for the sample Nature Walk; follow posted path conditions.
Nature Walk route length|How long is the Nature Walk route?|The fictional marked Nature Walk loop is 0.8 miles; actual completion time depends on the guest's pace.
Nature Walk benches|Are there benches along Nature Walk?|Three shaded benches are listed along the fictional Nature Walk loop.
Garden photography|Can I take photos in the garden?|Personal photography is permitted in sample public gardens; respect other guests and ask staff before organized shoots.
Bike rental desk|Where can I ask about bike rentals?|The bike inquiry desk is located beside the north garden gate, open 9:00 AM to 5:00 PM; availability is not live.
Board games|Where can I borrow board games?|Sample chess, checkers and domino sets are located in the guest lounge; ask reception about borrowing a set.
Library nook|Where is the reading area?|The reading nook is located on the mezzanine above the lobby and is open from 7:00 AM to 10:00 PM.
Rainy day activities|What can I do indoors on a rainy day?|Sample indoor options include the reading nook, guest lounge board games and the fitness center; spa services require appointments.
Activity enrollment|Can the assistant sign me up for an activity?|The assistant can explain sample activities and save them to your session plan, but cannot enroll a guest or contact an activity leader.
Children's craft table|Where is the craft table?|The fictional craft table is located in the family lounge; activity times must be confirmed with staff.
Family lounge location|Where is the family lounge?|The family lounge is located on the ground floor of the east wing beside the guest laundry staircase.
Baby cot requests|Can I request a baby cot?|Sample baby cots may be requested from staff, subject to room suitability and availability; no request is submitted by the assistant.
Stroller storage|Where can I store a stroller?|The stroller storage location is unconfirmed; reception can advise; do not leave strollers blocking corridors or exits.
Family restroom|Where is the family restroom?|The sample family restroom is located beside the lobby courtyard entrance.
Children supervision|Can children visit activities alone?|The fictional resort requires an accompanying responsible adult for children's activities; the assistant does not provide supervision.
Games room hours|When is the games room open?|The fictional games room is located in the family lounge and is open from 9:00 AM to 9:00 PM.
Games room equipment|What is in the games room?|The sample games room contains a table football game, puzzles and a small drawing table.
Teen lounge|Is there a teen lounge?|No separate teen lounge is listed in the sample dataset; the family lounge and games room are available under posted rules.
Family movie inquiries|Is there a family movie tonight?|No dated movie event is confirmed in this dataset. Ask staff rather than assuming a screening is scheduled.
Accessible route map|Where can I find an accessible route map?|The fictional step-free route map is located at reception; staff must confirm current route conditions and individual requirements.
Lobby elevator|Where is the lobby elevator?|The main guest elevator is located to the right of reception, beside the east-wing corridor.
Pool step-free route|Is there a step-free route to Lagoon Pool?|The sample map shows a step-free route through the central garden; staff must confirm current accessibility and pool access equipment.
Hearing assistance inquiries|Is hearing assistance equipment available?|This dataset cannot confirm hearing assistance equipment availability; please ask staff about your requirements.
Large print information|Can I get large print resort information?|The sample reception service offers large-print maps on request; ask staff to confirm availability.
Rest area locations|Where are shaded rest areas?|Shaded seating is located in the lobby courtyard, west garden and beside the north garden trail entrance.
Low stimulation space|Is there a quieter place to sit?|The sample reading nook is a quieter seating area; sound levels and availability are not guaranteed.
Accessible shuttle inquiries|Is accessible transport available?|Accessible transport details are not verified in this dataset; staff should confirm vehicle specifications before travel.
Assistance animal facilities|Where can I ask about assistance animal facilities?|The assistance animal inquiry point is located at reception; ask staff about suitable relief areas and accommodation needs; service animals remain welcome under the existing sample policy.
Accessible dining seating|Can dining staff help with accessible seating?|Dining staff can discuss seating requirements and current layout; the assistant cannot guarantee or reserve a specific table.
EV charging location|Where are the EV chargers?|Two fictional EV charging bays are located in the east parking area; compatibility, prices and availability must be checked with staff.
Bicycle parking|Where can I park a bicycle?|Bicycle racks are located beside the north garden entrance; guests should use their own lock.
Rideshare meeting point|Where do rideshare drivers meet guests?|The fictional rideshare meeting point is located outside the main lobby under the blue canopy.
Coach drop-off|Where can a coach drop off passengers?|The sample coach drop-off bay is located beside the south entrance; drivers must follow staff direction.
Lost property inquiries|How do I ask about lost property?|Contact reception with a description of the item; this assistant cannot check a live lost-property inventory or notify staff.
Recycling locations|Where are the recycling bins?|Marked recycling stations are located near reception, the pool entrance and the east-wing elevator.
Printing service|Can I print a document?|The sample business nook beside reception offers printing inquiries through staff; prices and availability must be confirmed.
Meeting nook|Where can I take a work call?|The fictional business nook is located beside reception; quiet seating availability is not guaranteed.
Souvenir shop location|Where is the souvenir shop?|The sample gift shop is located in the lobby courtyard and opens from 10:00 AM to 6:00 PM.
Postal drop inquiries|Can I mail a postcard?|Reception can explain local postal options; this assistant cannot arrange collection or guarantee delivery.'''
rows=[]
for i,line in enumerate(DATA.splitlines(),1):
 topic,question,answer=line.split('|')
 category=next(label for end,label in [(10,'Arrival'),(20,'Rooms'),(30,'Guest services'),(45,'Dining'),(55,'Pools'),(65,'Wellness'),(75,'Activities'),(85,'Family'),(95,'Accessibility'),(105,'Travel and services')] if i<=end)
 rows.append(dict(id=f'expanded-{i:03}',category=category,topic=topic,answer=answer,source='Fictional GatorGo demo handbook — not real property information',status='demo_only',updated='2026-11-18',tags=[topic.lower(),question.lower()]))
assert len(rows)>=100,len(rows)
(ROOT/'knowledge/expanded.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False),encoding='utf-8')
names=['Alex Morgan','Jamie Rivera','Taylor Chen','Jordan Brooks','Casey Patel','Riley Thompson','Morgan Ellis','Avery Kim','Quinn Parker','Cameron Lee','Skyler Davis','Reese Wilson','Peyton Garcia','Rowan Bennett','Emerson Clark','Finley Adams','Harper Nguyen','Dakota Reed','Sage Miller','Blake Carter']
customers=[]
for i,name in enumerate(names):
 arrival=date(2026,11,17)+timedelta(days=i%3)
 customers.append(dict(id=f'GUEST-{i+1:03}',name=name,fictional=True,room=str(201+i),room_type=['Garden King','Lagoon Twin','Family Suite','Cabana Suite'][i%4],arrival=arrival.isoformat(),departure=(arrival+timedelta(days=3+i%4)).isoformat(),party_size=[2,2,4,2][i%4],breakfast_included=i%2==0,preferences=[['firm pillows','quiet room'],['oat milk','garden views'],['extra blankets','family activities'],['soft pillows','morning walks']][i%4],activities=[['Garden Discovery Walk at 10:00 AM on November 19, 2026'],['Poolside reading at 2:00 PM on November 19, 2026'],['Family games at 4:00 PM on November 19, 2026'],['Yoga deck visit at 8:00 AM on November 19, 2026']][i%4],notes='Fictional itinerary only; no real booking, payment or identity verification.'))
(ROOT/'knowledge/sample-customers.json').write_text(json.dumps(customers,indent=2),encoding='utf-8')
lines=['# Fictional demo examples','',f'{len(rows)} new resort questions and {len(customers)} entirely fictional guests. These are not real bookings.','', '## Resort questions','']+[f'{i}. {r["tags"][1].capitalize()}' for i,r in enumerate(rows,1)]+['','## Customer examples','', 'Ask “What room is Alex Morgan in?”, then “When do they check out?” or “Is breakfast included?”','', 'Ask “Show me GUEST-003” or “What are Taylor Chen’s preferences?”','', '| Demo ID | Fictional guest | Room | Stay |','|---|---|---|---|']+[f'| {c["id"]} | {c["name"]} | {c["room"]} | {c["arrival"]} to {c["departure"]} |' for c in customers]
(ROOT/'docs/sample-demo-examples.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(f'Created {len(rows)} Q&A records and {len(customers)} fictional guests')
