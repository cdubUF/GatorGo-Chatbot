"""Read-only adapter for Mews's public sandbox, never a production property."""
import logging
import threading
import time

import httpx

from .reservations import ReservationUnavailable, normalize

logger = logging.getLogger("gatorgo.mews")
BASE = "https://api.mews-demo.com/api/connector/v1/"


class MewsUnavailable(ReservationUnavailable):
    pass


class MewsSandboxReservations:
    def __init__(self, client_token, access_token, transport=None, clock=time.monotonic):
        self.client_token, self.access_token = client_token, access_token
        self.transport, self.clock = transport, clock
        self.cache, self.lock = {}, threading.Lock()

    def _post(self, endpoint, payload):
        body = {"ClientToken": self.client_token, "AccessToken": self.access_token,
                "Client": "GatorGo Sandbox 1.0", **payload}
        try:
            with httpx.Client(timeout=20, transport=self.transport, follow_redirects=False) as client:
                response = client.post(BASE + endpoint, json=body)
                response.raise_for_status()
                data = response.json()
                if not isinstance(data, dict):
                    raise ValueError("Unexpected Mews response")
                return data
        except httpx.HTTPStatusError as error:
            logger.warning("Mews sandbox request failed: HTTP %s", error.response.status_code)
            raise MewsUnavailable() from None
        except (httpx.HTTPError, ValueError, TypeError):
            logger.warning("Mews sandbox request failed: connection or invalid response")
            raise MewsUnavailable() from None

    def find(self, confirmation, name, hotel="mews-sandbox"):
        # User-supplied names never leave this server. Number filters avoid a broad scan.
        result = self._post("reservations/getAll/2023-06-06", {
            "Numbers": [confirmation.strip()], "Limitation": {"Count": 10}})
        rows = result.get("Reservations")
        if not isinstance(rows, list) or len(rows) >= 10:
            raise MewsUnavailable()
        matches = [r for r in rows if isinstance(r, dict)
                   and normalize(str(r.get("Number", ""))) == normalize(confirmation)]
        if not matches:
            result = self._post("reservations/getAll/2023-06-06", {
                "ChannelNumbers": [confirmation.strip()], "Limitation": {"Count": 10}})
            rows = result.get("Reservations")
            if not isinstance(rows, list) or len(rows) >= 10:
                raise MewsUnavailable()
            matches = [r for r in rows if isinstance(r, dict)
                       and normalize(str(r.get("ChannelNumber", ""))) == normalize(confirmation)]
        # A confirmation can cover multiple reservations. Resolve the customer
        # for each candidate and proceed only if the name identifies exactly one.
        matches = [row for row in matches if row.get("AccountType") == "Customer"
                   and isinstance(row.get("AccountId"), str) and isinstance(row.get("Id"), str)]
        if not matches:
            return None
        account_ids = list(dict.fromkeys(row["AccountId"] for row in matches))
        result = self._post("customers/getAll", {"CustomerIds": account_ids,
            "Extent": {"Customers": True, "Documents": False, "Addresses": False},
            "Limitation": {"Count": 100}})
        customers = result.get("Customers")
        if not isinstance(customers, list) or len(customers) >= 100:
            raise MewsUnavailable()
        customer_map = {}
        for customer in customers:
            if not isinstance(customer, dict) or customer.get("Id") not in account_ids:
                continue
            first, last = customer.get("FirstName") or "", customer.get("LastName") or ""
            if not isinstance(first, str) or not isinstance(last, str):
                raise MewsUnavailable()
            if normalize(f"{first} {last}") == normalize(name):
                customer_map[customer["Id"]] = customer
        matching = [row for row in matches if row["AccountId"] in customer_map]
        if len(matching) != 1:
            return None
        reservation = matching[0]
        reservation_id = reservation["Id"]
        customer = customer_map[reservation["AccountId"]]
        first, last = customer.get("FirstName") or "", customer.get("LastName") or ""
        counts = reservation.get("PersonCounts") or []
        if not isinstance(counts, list) or any(not isinstance(c, dict) or
                not isinstance(c.get("Count"), int) for c in counts):
            raise MewsUnavailable()
        row = {
            "id": reservation_id, "confirmation": str(reservation.get("Number", "")),
            "first_name": first, "last_name": last,
            "room_type": "Not available from this lookup",
            "check_in": reservation.get("ScheduledStartUtc") or reservation.get("StartUtc") or "Not available",
            "check_out": reservation.get("ScheduledEndUtc") or reservation.get("EndUtc") or "Not available",
            "guests": sum(c["Count"] for c in counts) if counts else "Not available",
            "status": {"Confirmed": "confirmed", "Started": "checked in", "Processed": "checked out",
                       "Canceled": "canceled"}.get(reservation.get("State"), "unknown"),
        }
        with self.lock:
            now = self.clock()
            self.cache = {key: value for key, value in self.cache.items() if value[1] > now}
            if len(self.cache) >= 5000:
                raise MewsUnavailable()
            self.cache[reservation_id] = (row, now + 1200)
        return row

    def by_id(self, reservation_id):
        with self.lock:
            item = self.cache.get(reservation_id)
            if not item or item[1] <= self.clock():
                self.cache.pop(reservation_id, None)
                return None
            return item[0]
