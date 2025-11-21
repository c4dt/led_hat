# LED Hat

Drive the LEDs on a hat with formulas.

![LED Hat](/led_hat.jpg)

The LEDs are driven by an [Atom-Lite](https://docs.m5stack.com/en/core/ATOM%20Lite)
which polls the server 20 times a second for an updated buffer.
The server itself is built using axom, and allows for formulas sent by
users, as well as some icons.
An admin user can set the icons, and should also be able to create
countdown timers.
All of this has been created for the [Swiss Crypto Day - Halloween Edition](https://scd2025.c4dt.org).

See the [slides for the Blackalps '25 rump session](slides_blackalps_2025_rump.pdf)

# User Interface

For the user interface, there are two sets:

- Admin - allows to change between countdown-timer or free access
- Users - can submit new formulas for display

## Admin Interface

The Admin interface is protected by a secret value shared between the
admin and the backend.
It shows the following buttons:

- 15' countdown
- 30' countdown
- x' countdown (with an input field)
- Reset countdown
- User Access
- Luminosity of the LEDs

## User Access

If the system is in countdown mode, the UI shows "No access - come back later".
Else the system shows:

- a short explanation
- one field for every color
- a simulation of the LEDs with the given fields
- to come:
  - configuration switches (ranges for functions)
  - history of past formulas

The supported formulas are:
- + - / *
- cos(x), sin(x), tan(x), acos(x), asin(x), atan(x)
- sqrt(x), exp(x), pow(x, y), abs(x)

The variables are:
- x - going from -1 to 1, around the hat. 0 is in front.
- y - going from 0 to 1, from the bottom to the top.
- t - seconds since start, from 0 to infinity, increased 20 times a second

The formulas are read as reverse polish notation up to the first error.
For example:
- `t x + sin` equals `sin(t + x)`
