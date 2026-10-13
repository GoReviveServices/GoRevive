import React from 'react'
import { BannerSlider } from './BannerSlider'
import { ITADCapabilitiesSection } from './ITADCapabilitiesSection'
import { CompanyStats } from './CompanyStats'
import { Features } from './Features'
import { BusinessValueSection } from './BusinessValueSection'
import { ProcessSection } from './ProcessSection'
import { FeaturedProductsSection } from './FeaturedProductsSection'
import CategoriesSection from './CategoriesSection'
import BrandsSection from './BrandsSection'

function Hero({ initialBanners = [] }) {
  return (
    <>
    <BannerSlider initialBanners={initialBanners} />
    <ITADCapabilitiesSection/>
    <CompanyStats/>
    <CategoriesSection/>
    <BrandsSection/>
    <Features />
    <FeaturedProductsSection/>
    <BusinessValueSection/>
    <ProcessSection/>

    </>
  )
}

export default Hero