function Get-PocketHeistLayouts {
    return @(
        @{
            Name = 'office shell'
            Player = '0,0'
            Exit = '6,0'
            Walls = @('1,2','2,2','3,2','3,4','4,4','5,1')
            Cameras = @('0,4','2,5','5,3')
            Loot = @('1,5','4,1','6,6')
            Intel = '5,5'
            Modifier = 'Lobby lights flicker. First camera trip this floor is softer.'
            Guards = @(@{ Row = 6; Col = 5 }, @{ Row = 2; Col = 0 })
        },
        @{
            Name = 'vault mezzanine'
            Player = '0,1'
            Exit = '6,6'
            Walls = @('1,1','1,2','1,4','2,4','3,1','4,3','5,3','5,5')
            Cameras = @('0,5','3,5','4,0')
            Loot = @('0,6','4,2','6,1')
            Intel = '2,6'
            Modifier = 'Thin catwalks. Guards push harder when they get close.'
            Guards = @(@{ Row = 6; Col = 0 }, @{ Row = 3; Col = 3 })
        },
        @{
            Name = 'penthouse relay'
            Player = '0,6'
            Exit = '6,3'
            Walls = @('1,5','2,1','2,2','2,5','3,5','4,2','4,4','5,4')
            Cameras = @('1,0','3,2','5,6')
            Loot = @('0,1','3,6','6,0')
            Intel = '4,6'
            Modifier = 'Executive tower. Intel grants a full smoke refill here.'
            Guards = @(@{ Row = 6; Col = 6 }, @{ Row = 4; Col = 1 }, @{ Row = 1; Col = 3 })
        },
        @{
            Name = 'server room'
            Player = '0,3'
            Exit = '6,3'
            Walls = @('1,0','1,6','2,3','3,0','3,6','4,3','5,1','5,5')
            Cameras = @('0,6','2,0','4,6','6,0')
            Loot = @('1,3','3,2','5,4')
            Intel = '3,4'
            Modifier = 'Hardened data floor. Camera trips add 22 alarm instead of 18.'
            Guards = @(@{ Row = 6; Col = 1 }, @{ Row = 2; Col = 5 }, @{ Row = 4; Col = 0 })
        },
        @{
            Name = 'rooftop exit'
            Player = '6,0'
            Exit = '0,6'
            Walls = @('0,2','1,4','2,0','3,3','4,5','5,2','5,6')
            Cameras = @('0,4','2,2','3,6','5,4')
            Loot = @('1,1','4,2','6,5')
            Intel = '2,5'
            Modifier = 'Open rooftop. Guards patrol faster. Smoke covers only 2 turns.'
            Guards = @(@{ Row = 0; Col = 0 }, @{ Row = 2; Col = 6 }, @{ Row = 4; Col = 4 }, @{ Row = 6; Col = 3 })
        }
    )
}
