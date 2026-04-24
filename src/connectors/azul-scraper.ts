import { createClient } from '@supabase/supabase-js';

export interface BookingData {
    locator: string;
    passengerName: string;
    passengerTicket: string;
    origin: string;
    destination: string;
    flightDate: string;
    departureTime: string;
    arrivalTime: string;
    operatingAirline: string;
    flightNumber: string;
    flightCategory: string;
    isRoundTrip: boolean;
    returnDate?: string;
    returnOrigin?: string;
    returnDestination?: string;
    returnDepartureTime?: string;
    returnArrivalTime?: string;
    milesUsed: number;
    cashPaid: number;
    paymentCard: string;
    status: string;
}

export class AzulScraper {
    private supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    private log(msg: string) { console.log(`[AZUL ${new Date().toISOString()}] ${msg}`); }

    async saveBookingPublic(booking: BookingData, accountId?: string): Promise<boolean> {
        return this.saveBooking(booking, accountId);
    }

    private async saveBooking(booking: BookingData, accountId?: string): Promise<boolean> {
        try {
            const { error } = await this.supabase.from('extracted_bookings').upsert({
                airline: booking.operatingAirline || 'Azul',
                locator: booking.locator,
                passenger_name: booking.passengerName,
                origin: booking.origin,
                destination: booking.destination,
                flight_date: booking.flightDate,
                miles_used: booking.milesUsed,
                cash_paid: booking.cashPaid,
                taxes: booking.cashPaid,
                status: 'synced',
                source: `${booking.operatingAirline} ${booking.flightNumber}`.trim(),
                notes: [(booking as any).emissionDate ? `EMITIDO:${(booking as any).emissionDate}` : '', booking.flightCategory, `${booking.departureTime}→${booking.arrivalTime}`, booking.isRoundTrip ? `Volta: ${booking.returnDate} ${booking.returnOrigin}→${booking.returnDestination}` : 'Só ida', booking.passengerTicket, booking.status].filter(Boolean).join(' | '),
            }, { onConflict: 'airline,locator' });

            if (error) { this.log(`DB error ${booking.locator}: ${error.message}`); return false; }
            return true;
        } catch (err: any) {
            this.log(`Save failed: ${err.message}`);
            return false;
        }
    }
}
