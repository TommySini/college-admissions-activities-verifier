import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Get the first admin user, or first user if no admin exists
  let user = await prisma.user.findFirst({
    where: { role: "admin" },
  });

  if (!user) {
    user = await prisma.user.findFirst();
  }

  if (!user) {
    console.error("No users found in database. Please create a user first.");
    process.exit(1);
  }

  console.log(`Using user: ${user.email} (${user.role})`);

  // Opportunity 1: Tutor K-12 Students Online
  const opportunity1 = await prisma.volunteeringOpportunity.upsert({
    where: {
      id: "test-opp-1",
    },
    update: {},
    create: {
      id: "test-opp-1",
      title: "Tutor K-12 Students Online",
      description:
        "Fill out a brief application with EmpowerEd to sign up to tutor students virtually across the nation. EmpowerEd is a tutoring organization that operates on the LearnToBe platform. Once accepted, you can connect with students of your choice to begin tutoring at a scheduled time.",
      organization: "EmpowerEd, LearnToBe",
      category: "Education",
      location: "Remote",
      contactEmail: null,
      contactPhone: null,
      website: "https://www.learntobe.org/apply/39a4",
      startDate: new Date(),
      endDate: null,
      isOngoing: true,
      hoursPerSession: 1.0,
      totalHours: null,
      commitmentLevel: "Medium",
      ageRequirement: "16+",
      skillsRequired: "Teaching, Patience, Communication",
      maxVolunteers: null,
      status: "approved",
      postedById: user.id,
      approvedById: user.id,
    },
  });

  console.log("✅ Created opportunity 1:", opportunity1.title);

  // Opportunity 2: Volunteer at Lake Park Public Library
  const opportunity2 = await prisma.volunteeringOpportunity.upsert({
    where: {
      id: "test-opp-2",
    },
    update: {},
    create: {
      id: "test-opp-2",
      title: "Volunteer at Lake Park Public Library",
      description:
        "Volunteer at the Lake Park Public Library by assisting younger students with their homework after school. There are also 3 other programs to participate in which include volunteering with a preschool enrichment club on Saturdays, a chess club, and helping with adult English classes (ELL) at the library. These volunteering opportunities are ran by CareCrew at the Lake Park Public Library. To sign up, contact CareCrew by texting (203) 252-0260, or email them at carecrewinc@gmail.com.",
      organization: "Lake Park Public Library, CareCrew",
      category: "Education",
      location: "Lake Park, FL 33403",
      contactEmail: "carecrewinc@gmail.com",
      contactPhone: "(203) 252-0260",
      website: "https://carecrewinc.org/reachout",
      startDate: new Date(),
      endDate: null,
      isOngoing: true,
      hoursPerSession: 2.0,
      totalHours: null,
      commitmentLevel: "Low",
      ageRequirement: "14+",
      skillsRequired: "Teaching, Patience, Communication",
      maxVolunteers: null,
      status: "approved",
      postedById: user.id,
      approvedById: user.id,
    },
  });

  console.log("✅ Created opportunity 2:", opportunity2.title);

  console.log("\n🎉 Successfully added 2 test opportunities!");
  console.log("You can now view them at: http://localhost:3000/volunteering");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

