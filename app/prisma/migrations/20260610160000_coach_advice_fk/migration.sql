-- AddForeignKey
ALTER TABLE "MarketingCoachAdvice" ADD CONSTRAINT "MarketingCoachAdvice_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
