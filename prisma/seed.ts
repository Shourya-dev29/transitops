// ============================================================
// TransitOps — Database Seed Script (Indian Localization)
// ============================================================
// Run with: npm run db:seed (or: tsx prisma/seed.ts)
// Creates Indian demo users, Indian commercial vehicles,
// Indian driver profiles, and routes between major Indian hubs.
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding TransitOps database (India Edition)...\n');

  // ── Clear existing data (order matters for FK constraints) ─
  await prisma.fuelLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  // ── Users (one per role) ──────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

  const fleetManager = await prisma.user.create({
    data: {
      email: 'fleet@transitops.com',
      password: passwordHash,
      name: 'Sunita Sharma',
      role: 'FLEET_MANAGER',
    },
  });

  const driver = await prisma.user.create({
    data: {
      email: 'rajesh.k@transitops.com',
      password: passwordHash,
      name: 'Rajesh Kumar',
      role: 'DRIVER',
    },
  });

  const safetyOfficer = await prisma.user.create({
    data: {
      email: 'safety@transitops.com',
      password: passwordHash,
      name: 'Vikram Singh',
      role: 'SAFETY_OFFICER',
    },
  });

  const financialAnalyst = await prisma.user.create({
    data: {
      email: 'finance@transitops.com',
      password: passwordHash,
      name: 'Priya Patel',
      role: 'FINANCIAL_ANALYST',
    },
  });

  console.log('✅ Created 4 Indian users (all passwords: password123)');
  console.log(`   Fleet Manager:     ${fleetManager.email} (Sunita Sharma)`);
  console.log(`   Driver:            ${driver.email} (Rajesh Kumar)`);
  console.log(`   Safety Officer:    ${safetyOfficer.email} (Vikram Singh)`);
  console.log(`   Financial Analyst: ${financialAnalyst.email} (Priya Patel)`);

  // ── Vehicles (Tata, Mahindra, Ashok Leyland, Maruti Suzuki) ─
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        registrationNumber: 'MH-12-TR-9001',
        make: 'Tata',
        model: 'Prima 5530.S',
        year: 2022,
        type: 'Truck',
        status: 'AVAILABLE',
        maxLoadCapacity: 25000,
        currentOdometer: 45200,
        acquisitionCost: 4500000, // in INR
        region: 'North',
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'DL-01-TR-4521',
        make: 'Ashok Leyland',
        model: 'AVTR 5532',
        year: 2021,
        type: 'Truck',
        status: 'AVAILABLE',
        maxLoadCapacity: 22000,
        currentOdometer: 67800,
        acquisitionCost: 4200000,
        region: 'North',
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'KA-03-VN-8877',
        make: 'Mahindra',
        model: 'Bolero Pik-Up',
        year: 2023,
        type: 'Van',
        status: 'AVAILABLE',
        maxLoadCapacity: 1500,
        currentOdometer: 12300,
        acquisitionCost: 950000,
        region: 'East',
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'HR-55-VN-0099',
        make: 'Tata',
        model: 'Yodha Pickup',
        year: 2022,
        type: 'Van',
        status: 'IN_SHOP',
        maxLoadCapacity: 1200,
        currentOdometer: 34500,
        acquisitionCost: 880000,
        region: 'East',
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'MH-02-BS-1122',
        make: 'Tata',
        model: 'Starbus 40',
        year: 2020,
        type: 'Bus',
        status: 'AVAILABLE',
        maxLoadCapacity: 8000,
        currentOdometer: 89400,
        acquisitionCost: 3200000,
        region: 'South',
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'DL-3C-SD-3344',
        make: 'Maruti Suzuki',
        model: 'Dzire Tour',
        year: 2023,
        type: 'Sedan',
        status: 'AVAILABLE',
        maxLoadCapacity: 400,
        currentOdometer: 8900,
        acquisitionCost: 750000,
        region: 'West',
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'GJ-01-TR-7788',
        make: 'Ashok Leyland',
        model: 'AVTR 4825',
        year: 2019,
        type: 'Truck',
        status: 'RETIRED',
        maxLoadCapacity: 20000,
        currentOdometer: 245000,
        acquisitionCost: 3800000,
        region: 'North',
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'MH-14-SV-5566',
        make: 'Mahindra',
        model: 'Scorpio Classic',
        year: 2023,
        type: 'SUV',
        status: 'AVAILABLE',
        maxLoadCapacity: 700,
        currentOdometer: 15600,
        acquisitionCost: 1650000,
        region: 'West',
      },
    }),
  ]);

  console.log(`\n✅ Created ${vehicles.length} Indian vehicles (Tata, Mahindra, Ashok Leyland)`);

  // ── Drivers (Indian Names) ─────────────────────────────────
  const now = new Date();
  const futureDate = (months: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    return d;
  };
  const pastDate = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d;
  };

  const drivers = await Promise.all([
    prisma.driver.create({
      data: {
        name: 'Rajesh Kumar',
        email: 'rajesh.k@transitops.com',
        phone: '+91-98765-43210',
        licenseNumber: 'DL-1420240001',
        licenseExpiryDate: futureDate(18),
        status: 'AVAILABLE',
        safetyScore: 95,
        region: 'North',
      },
    }),
    prisma.driver.create({
      data: {
        name: 'Amit Sharma',
        email: 'amit.s@transitops.com',
        phone: '+91-98765-43211',
        licenseNumber: 'DL-1420240002',
        licenseExpiryDate: futureDate(6),
        status: 'AVAILABLE',
        safetyScore: 88,
        region: 'East',
      },
    }),
    prisma.driver.create({
      data: {
        name: 'Rohan Verma',
        email: 'rohan.v@transitops.com',
        phone: '+91-98765-43212',
        licenseNumber: 'DL-1420240003',
        licenseExpiryDate: futureDate(2),
        status: 'ON_TRIP',
        safetyScore: 92,
        region: 'South',
      },
    }),
    prisma.driver.create({
      data: {
        name: 'Vikram Sen',
        email: 'vikram.s@transitops.com',
        phone: '+91-98765-43213',
        licenseNumber: 'DL-1420240004',
        licenseExpiryDate: futureDate(0), // Expiring this month
        status: 'AVAILABLE',
        safetyScore: 78,
        region: 'West',
      },
    }),
    prisma.driver.create({
      data: {
        name: 'Sandeep Gill',
        email: 'sandeep.g@transitops.com',
        phone: '+91-98765-43214',
        licenseNumber: 'DL-1420240005',
        licenseExpiryDate: pastDate(15), // EXPIRED
        status: 'SUSPENDED',
        safetyScore: 65,
        region: 'North',
      },
    }),
    prisma.driver.create({
      data: {
        name: 'Vijay Yadav',
        email: 'vijay.y@transitops.com',
        phone: '+91-98765-43215',
        licenseNumber: 'DL-1420240006',
        licenseExpiryDate: futureDate(12),
        status: 'OFF_DUTY',
        safetyScore: 91,
        region: 'East',
      },
    }),
  ]);

  console.log(`✅ Created ${drivers.length} Indian drivers`);

  // ── Completed Trips (Indian Routes: Delhi, Mumbai, Bangalore, Chennai) ──
  const completedTrip1 = await prisma.trip.create({
    data: {
      vehicleId: vehicles[0].id, // Prima Truck
      driverId: drivers[0].id, // Rajesh
      origin: 'Delhi Sanjay Gandhi Transport Nagar',
      destination: 'Mumbai Kalamboli Depot',
      cargoWeight: 18000,
      cargoDescription: 'Industrial machine gear assemblies',
      quotedRevenue: 155000, // in INR
      status: 'COMPLETED',
      scheduledDate: pastDate(30),
      dispatchedAt: pastDate(30),
      completedAt: pastDate(28),
      finalOdometer: 46600, // distance ~ 1400 km
      fuelConsumed: 460,
      distance: 1400,
    },
  });

  const completedTrip2 = await prisma.trip.create({
    data: {
      vehicleId: vehicles[1].id, // Ashok Leyland Truck
      driverId: drivers[1].id, // Amit
      origin: 'Bangalore Yeshwanthpur Hub',
      destination: 'Chennai Madhavaram Depot',
      cargoWeight: 15000,
      cargoDescription: 'Automotive electronics components',
      quotedRevenue: 45000,
      status: 'COMPLETED',
      scheduledDate: pastDate(20),
      dispatchedAt: pastDate(20),
      completedAt: pastDate(19),
      finalOdometer: 68150, // distance ~ 350 km
      fuelConsumed: 110,
      distance: 350,
    },
  });

  const completedTrip3 = await prisma.trip.create({
    data: {
      vehicleId: vehicles[2].id, // Bolero PickUp
      driverId: drivers[0].id, // Rajesh
      origin: 'Kolkata Howrah Depot',
      destination: 'Bhubaneswar Industrial Estate',
      cargoWeight: 800,
      cargoDescription: 'Electrical switchgear spares',
      quotedRevenue: 18000,
      status: 'COMPLETED',
      scheduledDate: pastDate(10),
      dispatchedAt: pastDate(10),
      completedAt: pastDate(10),
      finalOdometer: 12750, // distance ~ 450 km
      fuelConsumed: 40,
      distance: 450,
    },
  });

  // A dispatched trip (Rohan is ON_TRIP with Starbus)
  await prisma.trip.create({
    data: {
      vehicleId: vehicles[4].id, // Tata Starbus
      driverId: drivers[2].id, // Rohan (ON_TRIP)
      origin: 'Pune Central Station',
      destination: 'Mumbai Domestic Airport T1',
      cargoWeight: 5000,
      cargoDescription: 'Airline crew transfer baggage',
      quotedRevenue: 12000,
      status: 'DISPATCHED',
      scheduledDate: pastDate(1),
      dispatchedAt: pastDate(1),
    },
  });

  // Update Starbus to ON_TRIP
  await prisma.vehicle.update({
    where: { id: vehicles[4].id },
    data: { status: 'ON_TRIP' },
  });

  // A draft trip
  await prisma.trip.create({
    data: {
      vehicleId: vehicles[0].id, // Prima Truck
      driverId: drivers[0].id, // Rajesh
      origin: 'Gurgaon Logistics Park',
      destination: 'Ahmedabad Sanand Hub',
      cargoWeight: 20000,
      cargoDescription: 'White goods appliances',
      quotedRevenue: 90000,
      status: 'DRAFT',
      scheduledDate: futureDate(0),
    },
  });

  console.log('✅ Created 5 trips across Indian routes (3 completed, 1 dispatched, 1 draft)');

  // ── Maintenance Logs (Indian Rupees) ──────────────────────
  // Yodha Pickup in shop
  await prisma.maintenanceLog.create({
    data: {
      vehicleId: vehicles[3].id, // Yodha Pickup (IN_SHOP)
      type: 'Brake Service',
      description: 'Front disc pads replacement and hub lubrication',
      cost: 4500, // INR
      startDate: pastDate(3),
      status: 'OPEN',
    },
  });

  // Completed records
  await prisma.maintenanceLog.create({
    data: {
      vehicleId: vehicles[0].id, // Prima Truck
      type: 'Oil Change',
      description: 'Engine oil and coolant flush with filter replacement',
      cost: 15000,
      startDate: pastDate(45),
      endDate: pastDate(44),
      status: 'CLOSED',
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      vehicleId: vehicles[1].id, // Ashok Leyland
      type: 'Tire Replacement',
      description: 'Rear axle tires replacement (4 new MRF radial tires)',
      cost: 92000,
      startDate: pastDate(60),
      endDate: pastDate(58),
      status: 'CLOSED',
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      vehicleId: vehicles[2].id, // Bolero
      type: 'Inspection',
      description: 'Pollution Under Control (PUC) and general roadworthiness inspection',
      cost: 1200,
      startDate: pastDate(15),
      endDate: pastDate(15),
      status: 'CLOSED',
    },
  });

  console.log('✅ Created 4 maintenance logs with cost in INR');

  // ── Fuel Logs (Indian fuel cost & Liters) ─────────────────
  await prisma.fuelLog.create({
    data: {
      vehicleId: vehicles[0].id,
      tripId: completedTrip1.id,
      date: pastDate(30),
      quantity: 460,
      costPerUnit: 94.50, // Rs/L
      totalCost: 43470,
      odometer: 46600,
    },
  });

  await prisma.fuelLog.create({
    data: {
      vehicleId: vehicles[1].id,
      tripId: completedTrip2.id,
      date: pastDate(20),
      quantity: 110,
      costPerUnit: 96.20,
      totalCost: 10582,
      odometer: 68150,
    },
  });

  await prisma.fuelLog.create({
    data: {
      vehicleId: vehicles[2].id,
      tripId: completedTrip3.id,
      date: pastDate(10),
      quantity: 40,
      costPerUnit: 102.40,
      totalCost: 4096,
      odometer: 12750,
    },
  });

  // Extra fuel fill
  await prisma.fuelLog.create({
    data: {
      vehicleId: vehicles[0].id,
      date: pastDate(15),
      quantity: 150,
      costPerUnit: 94.50,
      totalCost: 14175,
      odometer: 46900,
    },
  });

  console.log('✅ Created 4 fuel logs with Indian fuel rates (approx. ₹94-₹102 per liter)');

  // ── Expenses ──────────────────────────────────────────────
  await prisma.expense.create({
    data: {
      vehicleId: vehicles[0].id,
      category: 'Insurance',
      description: 'Tata Prima annual comprehensive insurance renewal',
      amount: 48000,
      date: pastDate(5),
    },
  });

  await prisma.expense.create({
    data: {
      vehicleId: vehicles[1].id,
      category: 'Toll',
      description: 'NH4 highway toll taxes - Bangalore to Chennai',
      amount: 2200,
      date: pastDate(20),
    },
  });

  await prisma.expense.create({
    data: {
      category: 'Insurance',
      description: 'Fleet umbrella third party cover policy',
      amount: 150000,
      date: pastDate(30),
    },
  });

  await prisma.expense.create({
    data: {
      vehicleId: vehicles[2].id,
      category: 'Parking',
      description: 'Monthly depot parking rent - Howrah terminal',
      amount: 5000,
      date: pastDate(1),
    },
  });

  console.log('✅ Created 4 expense logs');

  console.log('\n════════════════════════════════════════════════');
  console.log('  🚀 TransitOps Indian Database Seeded Successfully!');
  console.log('════════════════════════════════════════════════');
  console.log('\nLogin credentials (all passwords: password123):');
  console.log('  Fleet Manager:     fleet@transitops.com (Sunita Sharma)');
  console.log('  Driver:            rajesh.k@transitops.com (Rajesh Kumar)');
  console.log('  Safety Officer:    safety@transitops.com (Vikram Singh)');
  console.log('  Financial Analyst: finance@transitops.com (Priya Patel)');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
