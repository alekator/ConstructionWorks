import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const workTypes = [
  "Кладка перегородок",
  "Монтаж опалубки",
  "Армирование перекрытий",
  "Бетонирование колонн",
  "Штукатурные работы"
];

async function main() {
  await Promise.all(
    workTypes.map((name) =>
      prisma.workType.upsert({
        where: { name },
        create: { name },
        update: {}
      })
    )
  );

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
