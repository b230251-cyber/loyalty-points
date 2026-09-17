Approach
I treated the problem as a loyalty points system where the main priority is keeping the member's balance correct at all times.
I kept the points rules configurable so that tiers and earning rates can be changed without rewriting the main logic.
 Points and tiers
- Members have lifetime qualifying points and a separate spendable points balance.
- Tier changes are based on lifetime qualifying points.
- I added Platinum at 5000 lifetime points with an earning rate of 0.3 points per ₹1.
- Existing members are not changed unless they actually qualify for the new tier.

 Ledger and balance
I used a ledger to keep a record of every points transaction. The current balance is updated together with the ledger entry so that the balance can be checked against the transaction history.

This also makes purchases, redemptions and expirations easier to audit.

 90-day expiry
Points are tracked based on when they were earned so that only unused points older than 90 days can expire.

FIFO is used when consuming/expiring points. Expiration creates its own ledger entry, while lifetime qualifying points stay unchanged.

The `/clock` endpoint allows the expiry logic to be tested without waiting 90 days.

Tier notifications
When a purchase causes an actual tier change, a notification is added to the outbox. The notification is created only for a real tier upgrade, not for every purchase.

Using an outbox also keeps the tier update and notification event reliable.

Phone lookup
Phone numbers are normalized and indexed so that members can be found quickly even when the member list becomes large.

 Testing
I tested the existing features along with the three assessment twists. The final test suite passed all 30 tests, including tier changes, expiration, notifications, redemption, ledger consistency, concurrency and phone lookup.
