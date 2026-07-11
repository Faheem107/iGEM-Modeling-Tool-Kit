Major concern: if we are planning to deploy a solution with spores, then how is a kill switch that needs protein expression eradicating the presence of our bacteria?   
→ we cannot rely on just killing the vegetative bacteria, we have to also make sure the spores cannot germinate.  
The problem with mazE/mazF is that it does NOT kill spores, and nothing prevents them from regerminating. So therefore it is not a complete solution for getting rid of every last bacteria.   
Question to answer; How can we achieve a large, reproducible reduction in viable *B. subtilis* 168 spores after deployment, when the spores may be embedded in alginate, biofilm, and sand, without creating a worse environmental hazard?   
The major limitation is that any spores that fail to germinate remain protected. Even if they germinate, the bacteria could sporulate again when nutrients run out, creating a new persistent spore population. 

Breakdown of the flaw: the mazE/mazF system is a classic toxin-antitoxin circuit. mazF is a stable endoribonuclease (toxin) that cleaves mRNA, halting protein synthesis and killing the cell, while mazE is a labile antitoxin that neutralizes it.

* **Why it fails against spores:** mazF kills cells by disrupting active translation(conversion of DNA into mRNA which is the blueprint for protein making). However, when *B. subtilis* senses the harsh, nutrient-depleted desert environment, it undergoes sporulation, which is turning into a dormant spore. In a dormant spore, metabolic activity and protein translation completely shut down \= mazF is impractical. The toxin becomes entirely ineffective against the dormant spore. The engineered strain can then persist in the desert soil for decades as a resilient spore. When rain eventually falls, the spore can germinate, and if the plasmid or genetic circuit has mutated or degraded, it survives.

→ spores are resistant to harsh treatments and since we are deploying a solution with spores, we need to find a way to ensure bacteria AND spores are eliminated from the environment. 

Table summary of academic papers reviewed :

| Paper link | What it shows | Relevance to our project | Limitations |
| ----- | ----- | ----- | ----- |
| [Young & Setlow, 2003 — *Mechanisms of killing of Bacillus subtilis spores by hypochlorite and chlorine dioxide*](https://academic.oup.com/jambio/article-pdf/95/1/54/47300998/jambio0054.pdf) | Hypochlorite and chlorine dioxide can kill *B. subtilis* spores without primarily damaging their DNA. Chlorine-dioxide-treated spores may still undergo early germination changes, such as DPA release and cortex degradation, but fail to restart metabolism or grow.  | \- shows why we must confirm killing using CFU and outgrowth assays rather than only OD changes or microscopy **We can use it as an “against bio warfare” arg →** “Of particular recent interest in the field of spore decontamination are methods for inactivation of spores of the pathogen B. anthracis. These spores have long been considered as a possible bioterrorism or biowarfare agent, and recent events have made this consideration all too real. Two chemicals that are used to inactivate spores of B. anthracis are hypochlorite and chlorine dioxide, both of which kill spores quite well” |  \-the hypochlorite is toxic to env / chlorine dioxide is env friendly but harms marine ecosystems and fauna. (both are used for cleaning…)  \- lab conditions (no biofilm or sand) |
| [Szabo et al., 2012 — *Germinant-enhanced decontamination of Bacillus spores adhered to iron and cement-mortar drinking-water infrastructures*](https://pmc.ncbi.nlm.nih.gov/articles/PMC3302637/) | Studies if germination before killing (disinfecting here) can effectively remove Bacillus spores  If we find a method than can fully remove the spores, it’s almost a guarantee to remove the vegetative cells.  Their issue was that spores in infrastructure are hard to reach → which is exactly our issue with spores that might be trapped in biofilms  | \- shows that spores are way more resistant that vegetative bacteria, thus why we need a second kill mechanism. \- the combined approach of germination then trigger mazE/F can be more successful than just kill switch alone \-They measured germination by heat-shocking the samples at 80°C for ten minutes, plating them on agar and incubating them to see the proportion of spores that remain | In our case, germination would be way more difficult because the desert is nutrient deficient \= sporulation Didn’t use B.subtilis but other strain of bacillus  |
| [Ghosh et al., 2012 — *Levels of germination proteins in dormant and superdormant spores of Bacillus subtilis*](https://pmc.ncbi.nlm.nih.gov/articles/PMC3347068/) | Superdomant (doesn’t respond to a germinant) vs dormant spores Purpose of study: finding out why some spores don’t respond to specific germinants (they used our strain ;p) | It explains why one application of L-alanine may not germinate every spore. It justifies testing multiple or combined germinants and measuring the remaining heat-resistant spore fraction after treatment. \- GerA, GerB, and GerK are the 3 receptors of B.subtilis. L-Valine or L-alanine triggers spore germination via the GerA GR, while the GerB and GerK GRs are both required for spore germination with the AGFK mixture. It might be useful to use different germinants each time we want to germinate to try as much as possible to eliminate spores..  This paper shows that a small but important fraction of *B. subtilis* 168-derived spores remain superdormant because they contain very low levels of particular germinant receptors, meaning that one germinant and probably even a combination of germinants may not activate every spore before the MazF kill switch is applied.  | We have to think through whether once they germinate they won’t re-sporulate   |
| [https://pmc.ncbi.nlm.nih.gov/articles/PMC2168948/pdf/1242-07.pdf](https://pmc.ncbi.nlm.nih.gov/articles/PMC2168948/pdf/1242-07.pdf)  | Moist heat kills *B. subtilis* spores mainly through damage and denaturation of essential proteins. Some heat-killed spores can still initiate germination but cannot proceed into successful outgrowth. | It gives us a strong laboratory positive control. We can use approved moist-heat treatment or autoclaving to confirm that our recovery and CFU assays correctly identify completely treated samples. | Moist heat is suitable for collected laboratory materials but is not a practical end-of-life treatment for a large outdoor desert site. |

Proposed methods of killing: 

1.  Make the germinated cells dependent on a supplied nutrient

[https://journals.asm.org/doi/10.1128/aem.02334-17](https://journals.asm.org/doi/10.1128/aem.02334-17) 

A stronger alternative to relying only on MazF is **thymineless-death containment**.

A published *B. subtilis* system disrupted both **thyA** and **thyB**, making germinated cells strictly dependent on externally supplied thymine or thymidine. Spores could still be produced under supplemented laboratory conditions, but after germination, cells died when the required nutrient was absent. The study reported approximately a **five-log loss of vegetative-cell viability within five hours** after thymine removal. For our concept: Carrier initially contains a limited amount of thymine → cells germinate and function temporarily → thymine becomes depleted or diluted → vegetative cells undergo thymineless death.

This would be more automatic than applying aTc throughout the desert. However, like MazF, it **does not immediately destroy dormant spores**. It controls what happens when those spores eventually germinate. 

2. Or use the multiple germinants technique, to try and wake up all spores 

[https://pmc.ncbi.nlm.nih.gov/articles/PMC3347068/](https://pmc.ncbi.nlm.nih.gov/articles/PMC3347068/)   

3. Use chemicals in a contained manner:

[https://pmc.ncbi.nlm.nih.gov/articles/PMC383127/](https://pmc.ncbi.nlm.nih.gov/articles/PMC383127/) 

Hypochlorite or chlorine dioxide could be evaluated as an emergency secondary treatment in contained sand microcosms, but not as the primary solution for large desert areas.

Their performance in water cannot be directly transferred to sand. Oxidants may be consumed by organic material and may not reach spores hidden inside pores, biofilm or alginate. In the drinking-water paper, chlorine could not reach some spores embedded in corroded material, while the smoother cement surface was easier to disinfect.

They would also affect native microorganisms and introduce spraying and residue concerns.

Here there is an environmental concern as all the chemicals we could shortlist are “detergents/bleach” that can damage fauna and flora.

→ methods to check: autoclaving \- hydrogen peroxide 

**Freeze-dried spores** → metabolically dormant.  
Rehydration \+ nutrients \+ suitable environmental conditions → **spores germinate.**  
Germination → the spore loses its protective layers and becomes a **vegetative Bacillus cell.**  
Vegetative cells grow, divide, and carry out functions such as biofilm formation, urease production, γ-PGA production, or CaCO₃ precipitation (depending on the strain).  
When nutrients become limited or conditions become unfavorable, the **vegetative cells can sporulate**, forming new dormant spores.

1. Freeze-dried spores  
2. Spores after they germinate become egetative Bacillus cells (kill switch will work)  
3. Vegetative cells form spores 

What if it was only freeze-dried → how to kill?  
What if spores germinate? Kill easily  
Vegetative cells form new spores → how kill?

A toxin like **MazF only works in metabolically active cells.** MazF kills by cleaving mRNA, so it requires:

* active transcription,  
* active translation,  
* and a growing (vegetative) bacterium.

**Engineered B. subtilis vegetative cells (in the lab)** carry your biofilm genes.  
You induce **sporulation**.  
You **freeze-dry the spores** for storage and deployment.  
In the desert, the spores are rehydrated and **germinate into vegetative cells**.  
The **vegetative cells** express the engineered biofilm genes, produce extracellular matrix components, attach to surfaces, and form the biofilm.  
Once nutrients become limiting or conditions become unfavorable, some vegetative cells **sporulate again**, producing new dormant spores.

If spores aren’t expressing the biofilm genes, what are we containing/ why do we need a kill switch for spores?  
The answer is that you don't know that they won't germinate. The concern is not the dormant spore itself- it's its potential to germinate later. So the thing is that when we spray the solution, right after the surface is gonna have both a) vegetative cells and b) spores.  
For a) vegetative cells the kill switch would work perfectly  
For b) spores the kill  switch won’t work since translation can’t occur. We wanna kill all spores so they can never germinate.

Remember what Professor Elisa said? That we want to induce bacteria formation from spores. And the way to do that is more complicated than just adding more food/ germinant. If we use this strategy “ use the multiple germinants technique, to try and wake up all spores,” we can a) induce sporulation and b) avoid the issue of kill switch not working for spores since we ensure that there are no spores/ there are only vegetative cells 

[Levels of Germination Proteins in Dormant and Superdormant Spores of Bacillus subtilis \- PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3347068/#sec8)   
Consequently, the most significant conclusion from the current work is that a major cause of *B. subtilis* spore superdormancy is almost certainly extremely low levels of specific GRs.    
More germinant receptors → faster and more complete germination. 

Does that mean spores can live forever and we dont care? What if spore flies away very far and germinates after a year? Cant control that?