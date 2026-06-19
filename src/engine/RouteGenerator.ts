import { RoadNode, CityRoadGenerator } from './CityRoadGenerator';
import { CarPhysics } from './CarPhysics';

export interface RouteStep {
  nodeId: string;
  streetNameKa: string;
  streetNameEn: string;
  directionEn: string;
  directionKa: string;
}

export class RouteGenerator {
  public routeSteps: RouteStep[] = [];
  public currentStepIndex: number = 0;
  private roadGenerator: CityRoadGenerator;

  constructor(roadGenerator: CityRoadGenerator, cityId: string) {
    this.roadGenerator = roadGenerator;
    this.generateRoute(cityId);
  }

  private generateRoute(cityId: string) {
    this.routeSteps = [];

    // Simple custom routes per city layout configuration
    if (cityId === 'kutaisi' || cityId === 'batumi') {
      this.routeSteps = [
        {
          nodeId: 'n_south',
          streetNameKa: 'რუსთაველის გამზირი',
          streetNameEn: 'Rustaveli Ave',
          directionKa: 'დაიწყეთ მოძრაობა რუსთაველის გამზირზე ჩრდილოეთით',
          directionEn: 'Start driving north on Rustaveli Avenue'
        },
        {
          nodeId: 'n_center',
          streetNameKa: 'ცენტრალური მოედანი',
          streetNameEn: 'Central Square',
          directionKa: 'გაიარეთ წრიული მოედანი და გააგრძელეთ პირდაპირ',
          directionEn: 'Enter the roundabout and continue straight'
        },
        {
          nodeId: 'n_north',
          streetNameKa: 'თამარ მეფის ქუჩა',
          streetNameEn: 'Tamar Mepe St',
          directionKa: 'ესტაკადის შემდეგ იმოძრავეთ პირდაპირ',
          directionEn: 'After the ramp, continue straight ahead'
        }
      ];
    } else if (cityId === 'telavi' || cityId === 'ozurgeti' || cityId === 'sachkhere') {
      this.routeSteps = [
        {
          nodeId: 'n_south',
          streetNameKa: 'ჩოლოყაშვილის ქუჩა',
          streetNameEn: 'Choloqashvili St',
          directionKa: 'დაიწყეთ მოძრაობა ჩოლოყაშვილის ქუჩაზე ჩრდილოეთით',
          directionEn: 'Start driving north on Choloqashvili Street'
        },
        {
          nodeId: 'n_center',
          streetNameKa: 'ცენტრალური გზაჯვარედინი',
          streetNameEn: 'Central Crossroad',
          directionKa: 'გზაჯვარედინზე მოუხვიეთ მარჯვნივ კახეთის გზატკეცილზე',
          directionEn: 'At the crossroad, turn RIGHT onto Kakheti Highway'
        },
        {
          nodeId: 'n_east',
          streetNameKa: 'კახეთის გზატკეცილი',
          streetNameEn: 'Kakheti Highway',
          directionKa: 'მიაღწიეთ ფინიშს კახეთის გზატკეცილზე',
          directionEn: 'Reach the finish line on Kakheti Highway'
        }
      ];
    } else {
      // Default: Soviet grid layout routes (e.g. Rustavi)
      this.routeSteps = [
        {
          nodeId: 'n_0_m',
          streetNameKa: 'შოთა რუსთაველის ქუჩა',
          streetNameEn: 'Shota Rustaveli St',
          directionKa: 'დაიწყეთ მოძრაობა რუსთაველის ქუჩაზე ჩრდილოეთით',
          directionEn: 'Start driving north on Rustaveli Street'
        },
        {
          nodeId: 'n_0_0',
          streetNameKa: 'მეგობრობის გამზირი',
          streetNameEn: 'Megobroba Ave',
          directionKa: 'მეგობრობის გამზირზე მოუხვიეთ მარჯვნივ',
          directionEn: 'At the intersection, turn RIGHT onto Megobroba Avenue'
        },
        {
          nodeId: 'n_p_0',
          streetNameKa: 'თბილისის გზატკეცილი',
          streetNameEn: 'Tbilisi Highway',
          directionKa: 'მოუხვიეთ მარცხნივ თბილისის გზატკეცილზე ჩრდილოეთით',
          directionEn: 'Turn LEFT onto Tbilisi Highway going north'
        },
        {
          nodeId: 'n_p_p',
          streetNameKa: 'შარტავას ქუჩა',
          streetNameEn: 'Shartava St',
          directionKa: 'გააჩერეთ მანქანა ფინიშის ხაზთან',
          directionEn: 'Bring the car to a halt at the finish stop line'
        }
      ];
    }
    this.currentStepIndex = 0;
  }

  public getActiveStep(): RouteStep | null {
    if (this.currentStepIndex >= this.routeSteps.length) return null;
    return this.routeSteps[this.currentStepIndex];
  }

  // Update path checking
  public update(car: CarPhysics): { completed: boolean; stepAdvanced: boolean } {
    const active = this.getActiveStep();
    if (!active) return { completed: true, stepAdvanced: false };

    const targetNode = this.roadGenerator.nodes.find(n => n.id === active.nodeId);
    if (!targetNode) return { completed: false, stepAdvanced: false };

    // Compute distance to next checkpoint node
    const dx = targetNode.x - car.x;
    const dz = targetNode.z - car.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // If within 6 meters, target is checked off!
    if (distance < 6.0) {
      this.currentStepIndex++;
      const isCompleted = this.currentStepIndex >= this.routeSteps.length;
      return { completed: isCompleted, stepAdvanced: true };
    }

    return { completed: false, stepAdvanced: false };
  }

  public getDistanceToNextNode(car: CarPhysics): number {
    const active = this.getActiveStep();
    if (!active) return 0;

    const targetNode = this.roadGenerator.nodes.find(n => n.id === active.nodeId);
    if (!targetNode) return 0;

    const dx = targetNode.x - car.x;
    const dz = targetNode.z - car.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}
