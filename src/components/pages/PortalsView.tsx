"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useTheme } from "@/components/theme-context";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselIndicator,
  CarouselNavigation,
} from "@/components/motion-primitives/carousel";
import { PORTAL_CARDS } from "@/src/lib/portalsData";

export default function PortalsView() {
  const router = useRouter();
  const { isLightMode } = useTheme();

  return (
    <div className="pt-24 pb-16 px-4 md:px-8 max-w-5xl mx-auto">
      <div className="mb-8 border-b pb-6 border-border">
        <TextEffect
          as="h1"
          per="word"
          preset="fade-in-blur"
          className="text-4xl font-extrabold tracking-tight mb-2"
        >
          Choose a Sandbox Portal
        </TextEffect>
        <p className="opacity-60 text-sm">
          Each portal is its own workspace, open one to begin simulating.
        </p>
      </div>

      <div className="relative rounded-[4px] overflow-hidden border border-border">
        <Carousel>
          <CarouselContent className="items-stretch">
            {PORTAL_CARDS.map((card) => (
              <CarouselItem key={card.id} className="h-full">
                <div
                  className={`relative h-[340px] sm:h-[380px] flex flex-col items-center justify-center text-center px-8 bg-gradient-to-br ${card.grad} ${isLightMode ? "bg-card" : "bg-dune-basalt"}`}
                >
                  <div className="mb-6 p-5 rounded-[4px] bg-secondary border border-border">
                    <span className="[&_svg]:w-10 [&_svg]:h-10">
                      {card.icon}
                    </span>
                  </div>
                  <h2 className="font-extrabold text-2xl sm:text-3xl mb-3 tracking-tight">
                    {card.title}
                  </h2>
                  <p className="text-sm sm:text-base opacity-70 leading-relaxed max-w-md mb-7">
                    {card.desc}
                  </p>
                  <button
                    onClick={() => router.push(card.href)}
                    className="px-8 py-3 rounded-[3px] bg-primary text-primary-foreground font-bold uppercase tracking-[0.15em] text-sm transition-opacity hover:opacity-90 flex items-center gap-2"
                  >
                    Enter Portal <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselNavigation
            alwaysShow
            className="left-0 w-full px-3 sm:px-4"
            classNameButton="bg-card hover:brightness-95 border border-border rounded-[3px] h-9 w-9 flex items-center justify-center"
          />
          <CarouselIndicator className="bottom-4" classNameButton="!w-2.5 !h-2.5" />
        </Carousel>
      </div>
    </div>
  );
}
